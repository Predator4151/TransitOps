const Driver = require('../models/Driver');
const Trip = require('../models/Trip');

// @desc    Get all drivers
// @route   GET /api/drivers
// @access  Private
exports.getDrivers = async (req, res) => {
  try {
    let query = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Search query matches name or licenseNumber
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { licenseNumber: searchRegex }
      ];
    }

    let queryChain = Driver.find(query);

    // Sorting
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      queryChain = queryChain.sort({ [req.query.sortBy]: sortOrder });
    } else {
      queryChain = queryChain.sort({ createdAt: -1 });
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Driver.countDocuments(query);

    queryChain = queryChain.skip(startIndex).limit(limit);

    const drivers = await queryChain;

    const pagination = {
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalResults: total
    };

    res.status(200).json({
      success: true,
      count: drivers.length,
      pagination,
      data: drivers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single driver
// @route   GET /api/drivers/:id
// @access  Private
exports.getDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new driver
// @route   POST /api/drivers
// @access  Private (Fleet Manager, Dispatcher, Safety Officer)
exports.createDriver = async (req, res) => {
  try {
    const { licenseNumber } = req.body;

    const existing = await Driver.findOne({ licenseNumber });
    if (existing) {
      return res.status(400).json({ success: false, message: `Driver with license number ${licenseNumber} already exists` });
    }

    const driver = await Driver.create(req.body);
    res.status(201).json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update driver
// @route   PUT /api/drivers/:id
// @access  Private (Fleet Manager, Dispatcher, Safety Officer)
exports.updateDriver = async (req, res) => {
  try {
    let driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (req.body.licenseNumber && req.body.licenseNumber !== driver.licenseNumber) {
      const existing = await Driver.findOne({ licenseNumber: req.body.licenseNumber });
      if (existing) {
        return res.status(400).json({ success: false, message: `Driver with license number ${req.body.licenseNumber} already exists` });
      }
    }

    driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete driver
// @route   DELETE /api/drivers/:id
// @access  Private (Fleet Manager)
exports.deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const activeTrip = await Trip.findOne({ driver: req.params.id, status: 'Dispatched' });
    if (activeTrip) {
      return res.status(400).json({ success: false, message: 'Cannot delete driver while they are active on a trip' });
    }

    await Driver.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
