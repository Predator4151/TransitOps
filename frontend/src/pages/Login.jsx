import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data) => {
    setErrorMsg('');
    setLoggingIn(true);
    const result = await login(data.email, data.password);
    setLoggingIn(false);
    if (result.success) {
      navigate('/');
    } else {
      setErrorMsg(result.message);
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
            <p className="text-muted small">Smart Transport Operations Platform</p>
          </div>

          {errorMsg && (
            <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
              <i className="bi-exclamation-triangle-fill"></i>
              <div>{errorMsg}</div>
            </div>
          )}

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

          {/* Quick Demo Login Panel */}
          <div className="mt-4 pt-4 border-top">
            <h6 className="text-center text-muted mb-3 small fw-semibold">QUICK DEMO ACCOUNTS (Password: Admin@123)</h6>
            <div className="row g-2">
              <div className="col-6">
                <button onClick={() => handleQuickDemo('admin')} className="btn btn-outline-primary btn-sm w-100 text-truncate py-2" title="Fleet Manager (admin@transitops.com)">
                  <i className="bi-shield-lock me-1"></i> Fleet Manager
                </button>
              </div>
              <div className="col-6">
                <button onClick={() => handleQuickDemo('dispatcher')} className="btn btn-outline-info btn-sm w-100 text-truncate py-2" title="Dispatcher (dispatcher@transitops.com)">
                  <i className="bi-geo-alt me-1"></i> Dispatcher
                </button>
              </div>
              <div className="col-6">
                <button onClick={() => handleQuickDemo('safety')} className="btn btn-outline-warning btn-sm w-100 text-truncate py-2" title="Safety Officer (safety@transitops.com)">
                  <i className="bi-shield-check me-1"></i> Safety Officer
                </button>
              </div>
              <div className="col-6">
                <button onClick={() => handleQuickDemo('analyst')} className="btn btn-outline-success btn-sm w-100 text-truncate py-2" title="Financial Analyst (analyst@transitops.com)">
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
