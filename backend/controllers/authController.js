const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to get token response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'transitops_jwt_secret_123456',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesRemaining = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(403).json({
        success: false,
        message: `Account is temporarily locked. Try again in ${minutesRemaining} minutes.`
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
        await user.save();
        return res.status(403).json({
          success: false,
          message: 'Account locked for 15 minutes due to 5 consecutive failed login attempts.'
        });
      }

      await user.save();
      const attemptsLeft = 5 - user.loginAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${attemptsLeft} attempts remaining before account is locked.`
      });
    }

    // Reset login attempts and lock values on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
    }
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password (with authentication checks)
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, name, newPassword } = req.body;

    if (!email || !name || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide email, name, and new password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Authenticate the request by verifying the name matches case-insensitively
    if (user.name.toLowerCase() !== name.toLowerCase()) {
      return res.status(401).json({ success: false, message: 'Identity verification failed. Name does not match.' });
    }

    // Set new password (pre-save hook will encrypt it)
    user.password = newPassword;

    // Reset lockout counters upon password reset
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. Account unlocked.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
