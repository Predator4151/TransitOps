import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';

const Login = () => {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('transitops_remembered_email');
    const savedPassword = localStorage.getItem('transitops_remembered_password');
    if (savedEmail && savedPassword) {
      setValue('email', savedEmail);
      setValue('password', savedPassword);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  const onSubmit = async (data) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoggingIn(true);
    const result = await login(data.email, data.password);
    setLoggingIn(false);
    if (result.success) {
      if (data.rememberMe) {
        localStorage.setItem('transitops_remembered_email', data.email);
        localStorage.setItem('transitops_remembered_password', data.password);
      } else {
        localStorage.removeItem('transitops_remembered_email');
        localStorage.removeItem('transitops_remembered_password');
      }
      navigate('/');
    } else {
      setErrorMsg(result.message);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    const formData = new FormData(e.target);
    const email = formData.get('resetEmail');
    const name = formData.get('resetName');
    const newPassword = formData.get('resetPassword');

    if (!email || !name || !newPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    setLoggingIn(true);
    try {
      const res = await auth.resetPassword(email, name, newPassword);
      if (res.success) {
        setSuccessMsg('Password reset successful. Account has been unlocked.');
        setForgotMode(false);
        setValue('email', email);
        setValue('password', newPassword);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Verification failed. Password reset rejected.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleQuickDemo = (role) => {
    let email = 'admin@transitops.com';
    if (role === 'dispatcher') email = 'dispatcher@transitops.com';
    else if (role === 'safety') email = 'safety@transitops.com';
    else if (role === 'analyst') email = 'analyst@transitops.com';
    
    setValue('email', email);
    setValue('password', 'Admin@123');
  };

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light px-3" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
      <div className="card shadow-lg border-0 rounded-4 overflow-hidden" style={{ maxWidth: '480px', width: '100%' }}>
        <div className="card-body p-4 p-md-5 bg-white">
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle mb-3" style={{ width: '60px', height: '60px' }}>
              <i className="bi-speedometer2 fs-1"></i>
            </div>
            <h3 className="fw-bold text-dark mb-1">TransitOps</h3>
            <p className="text-muted small">
              {forgotMode ? 'Reset Credentials and Unlock Account' : 'Smart Transport Operations Platform'}
            </p>
          </div>

          {errorMsg && (
            <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
              <i className="bi-exclamation-triangle-fill"></i>
              <div className="small">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success d-flex align-items-center gap-2" role="alert">
              <i className="bi-check-circle-fill"></i>
              <div className="small">{successMsg}</div>
            </div>
          )}

          {forgotMode ? (
            /* Forgot Password Form */
            <form onSubmit={handleResetSubmit}>
              {/* Reset Email */}
              <div className="mb-3">
                <label className="form-label text-secondary fw-medium small">Email Address</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi-envelope"></i></span>
                  <input 
                    type="email" 
                    name="resetEmail"
                    required
                    className="form-control border-start-0 bg-light"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Reset Name Verification */}
              <div className="mb-3">
                <label className="form-label text-secondary fw-medium small">Verify Full Name</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi-person"></i></span>
                  <input 
                    type="text" 
                    name="resetName"
                    required
                    className="form-control border-start-0 bg-light"
                    placeholder="e.g. System Admin (exactly as registered)"
                  />
                </div>
                <div className="text-muted fs-8 mt-1">To verify your identity, enter the registered account name.</div>
              </div>

              {/* Reset Password */}
              <div className="mb-4">
                <label className="form-label text-secondary fw-medium small">New Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi-lock"></i></span>
                  <input 
                    type="password" 
                    name="resetPassword"
                    required
                    className="form-control border-start-0 bg-light"
                    placeholder="•••••••• (Min. 6 chars)"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <button 
                type="submit" 
                className="btn btn-primary w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 mb-3"
                disabled={loggingIn}
              >
                {loggingIn ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Resetting...
                  </>
                ) : (
                  <>
                    <i className="bi-shield-check"></i> Reset Password
                  </>
                )}
              </button>

              <button 
                type="button" 
                onClick={() => { setForgotMode(false); setErrorMsg(''); setSuccessMsg(''); }} 
                className="btn btn-outline-secondary w-100 py-2.5 fw-semibold"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            /* Normal Login Form */
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Email Field */}
              <div className="mb-3">
                <label className="form-label text-secondary fw-medium small">Email Address</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi-envelope"></i></span>
                  <input 
                    type="email" 
                    className={`form-control border-start-0 bg-light ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="name@company.com"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                        message: 'Invalid email address'
                      }
                    })}
                  />
                </div>
                {errors.email && <div className="text-danger small mt-1">{errors.email.message}</div>}
              </div>

              {/* Password Field */}
              <div className="mb-4">
                <label className="form-label text-secondary fw-medium small">Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi-lock"></i></span>
                  <input 
                    type="password" 
                    className={`form-control border-start-0 bg-light ${errors.password ? 'is-invalid' : ''}`}
                    placeholder="••••••••"
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                  />
                </div>
                {errors.password && <div className="text-danger small mt-1">{errors.password.message}</div>}
              </div>

              {/* Remember Me & Forgot Password Link */}
              <div className="mb-4 d-flex justify-content-between align-items-center">
                <div className="form-check d-flex align-items-center mb-0">
                  <input 
                    type="checkbox" 
                    className="form-check-input me-2" 
                    id="rememberMe"
                    {...register('rememberMe')}
                    style={{ cursor: 'pointer' }}
                  />
                  <label className="form-check-label text-secondary small fw-medium mb-0" htmlFor="rememberMe" style={{ cursor: 'pointer' }}>
                    Remember Me
                  </label>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setForgotMode(true); setErrorMsg(''); setSuccessMsg(''); }} 
                  className="btn btn-link p-0 text-decoration-none small fw-semibold text-primary"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Login Button */}
              <button 
                type="submit" 
                className="btn btn-primary w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2"
                disabled={loggingIn}
              >
                {loggingIn ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Signing In...
                  </>
                ) : (
                  <>
                    <i className="bi-box-arrow-in-right"></i> Sign In
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Login Panel */}
          <div className="mt-4 pt-4 border-top d-print-none">
            <h6 className="text-center text-muted mb-3 small fw-semibold">QUICK DEMO ACCOUNTS (Password: Admin@123)</h6>
            <div className="row g-2">
              <div className="col-6">
                <button onClick={() => handleQuickDemo('admin')} className="btn btn-outline-primary btn-sm w-100 text-truncate py-2" title="Fleet Manager (admin@transitops.com) - Name: System Admin">
                  <i className="bi-shield-lock me-1"></i> Fleet Manager
                </button>
              </div>
              <div className="col-6">
                <button onClick={() => handleQuickDemo('dispatcher')} className="btn btn-outline-info btn-sm w-100 text-truncate py-2" title="Dispatcher (dispatcher@transitops.com) - Name: John Dispatcher">
                  <i className="bi-geo-alt me-1"></i> Dispatcher
                </button>
              </div>
              <div className="col-6">
                <button onClick={() => handleQuickDemo('safety')} className="btn btn-outline-warning btn-sm w-100 text-truncate py-2" title="Safety Officer (safety@transitops.com) - Name: Sarah Safety">
                  <i className="bi-shield-check me-1"></i> Safety Officer
                </button>
              </div>
              <div className="col-6">
                <button onClick={() => handleQuickDemo('analyst')} className="btn btn-outline-success btn-sm w-100 text-truncate py-2" title="Financial Analyst (analyst@transitops.com) - Name: Frank Financial">
                  <i className="bi-cash-coin me-1"></i> Fin. Analyst
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
