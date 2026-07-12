import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reports } from '../services/api';

const rolePathAccess = {
  'Fleet Manager': ['/vehicles', '/maintenance', '/settings'],
  'Dispatcher': ['/', '/trips', '/settings'],
  'Safety Officer': ['/drivers', '/compliance', '/settings'],
  'Financial Analyst': ['/fuel', '/expenses', '/reports', '/settings']
};

const DashboardLayout = () => {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('transitops_theme') || 'light');
  const [mobileSidebarShow, setMobileSidebarShow] = useState(false);
  const [notificationsList, setNotificationsList] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await reports.getNotifications();
        if (res.success) {
          setNotificationsList(res.data || []);
        }
      } catch (err) {
        console.error('Error fetching notifications in layout:', err);
      }
    };
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('transitops_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const allowedPaths = rolePathAccess[user.role] || [];
      const currentPath = location.pathname;
      
      const isAllowed = allowedPaths.some(path => 
        path === '/' ? currentPath === '/' : currentPath.startsWith(path)
      );
      
      if (!isAllowed && allowedPaths.length > 0) {
        navigate(allowedPaths[0]);
      }
    }
  }, [location.pathname, user, isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const navItems = [
    { name: 'Dashboard', icon: 'bi-grid-1x2', path: '/' },
    { name: 'Vehicles', icon: 'bi-truck', path: '/vehicles' },
    { name: 'Drivers', icon: 'bi-people', path: '/drivers' },
    { name: 'Trips', icon: 'bi-geo-alt', path: '/trips' },
    { name: 'Maintenance', icon: 'bi-tools', path: '/maintenance' },
    { name: 'Fuel Logs', icon: 'bi-fuel-pump', path: '/fuel' },
    { name: 'Expenses', icon: 'bi-cash-coin', path: '/expenses' },
    { name: 'Reports', icon: 'bi-bar-chart-line', path: '/reports' },
    { name: 'Compliance', icon: 'bi-shield-check', path: '/compliance' },
    { name: 'Settings', icon: 'bi-gear', path: '/settings' }
  ];

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Fleet Manager': return 'bg-primary text-white';
      case 'Dispatcher': return 'bg-info text-dark';
      case 'Safety Officer': return 'bg-warning text-dark';
      case 'Financial Analyst': return 'bg-success text-white';
      default: return 'bg-secondary text-white';
    }
  };

  return (
    <div className="min-vh-100 d-flex">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileSidebarShow ? 'show' : ''}`}>
        <div className="sidebar-logo">
          <i className="bi-speedometer2 text-primary fs-3 me-2"></i>
          <span className="text-white fs-4 fw-bold">TransitOps</span>
        </div>
        
        <ul className="sidebar-menu">
          {navItems
            .filter(item => (rolePathAccess[user?.role] || []).includes(item.path))
            .map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <li 
                  key={item.name} 
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileSidebarShow(false)}
                >
                  <Link to={item.path}>
                    <i className={`bi ${item.icon}`}></i>
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
        </ul>

        {/* User Card at bottom of sidebar */}
        <div className="p-3 border-top border-secondary border-opacity-10 d-flex flex-column gap-2 text-white-50">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '40px', height: '40px' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-white fw-semibold text-truncate">{user?.name}</div>
              <span className={`badge ${getRoleBadgeColor(user?.role)} fs-9`}>{user?.role}</span>
            </div>
          </div>
          <button 
            onClick={() => { logout(); navigate('/login'); }} 
            className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2 mt-2"
          >
            <i className="bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="main-content flex-grow-1">
        {/* Mobile Header */}
        <header className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom d-lg-none">
          <button 
            className="btn btn-light" 
            onClick={() => setMobileSidebarShow(!mobileSidebarShow)}
          >
            <i className="bi-list fs-4"></i>
          </button>
          <span className="fs-4 fw-bold">TransitOps</span>
          <button className="btn btn-light" onClick={toggleTheme}>
            <i className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'} fs-5`}></i>
          </button>
        </header>

        {/* Desktop Header */}
        <header className="d-none d-lg-flex justify-content-between align-items-center mb-4 pb-3 border-bottom position-relative">
          <div>
            <h4 className="fw-semibold mb-0">Smart Transport Operations</h4>
            <small className="text-muted">Logged in as {user?.role}</small>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted fs-7">
              <i className="bi-calendar-check me-1"></i> {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            
            {/* Alerts Dropdown Button */}
            <div className="position-relative">
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="btn btn-light rounded-circle position-relative"
                title="View System Alerts"
                style={{ width: '40px', height: '40px', padding: 0 }}
              >
                <i className="bi-bell fs-5"></i>
                {notificationsList.length > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle p-1.5 bg-danger border border-light rounded-circle" style={{ transform: 'translate(-50%, -20%)' }}>
                    <span className="visually-hidden">New alerts</span>
                  </span>
                )}
              </button>

              {/* Floating Dropdown Panel */}
              {showNotifDropdown && (
                <div 
                  className="card position-absolute end-0 mt-2 p-3 shadow-lg border-0" 
                  style={{ 
                    width: '320px', 
                    zIndex: 1100, 
                    borderRadius: '20px', 
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <h6 className="fw-bold mb-3 pb-2 border-bottom d-flex align-items-center justify-content-between text-wrap">
                    <span><i className="bi-bell-fill text-danger me-1"></i> System Alerts</span>
                    <span className="badge bg-danger rounded-pill fs-9">{notificationsList.length}</span>
                  </h6>
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }} className="d-flex flex-column gap-2">
                    {notificationsList.length > 0 ? (
                      notificationsList.map((notif, idx) => (
                        <div 
                          key={idx} 
                          className={`p-2.5 rounded-3 bg-${notif.type} bg-opacity-10 border-start border-3 border-${notif.type} d-flex align-items-start gap-2 text-wrap`}
                          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                          onClick={() => {
                            if (notif.path) {
                              navigate(notif.path);
                              setShowNotifDropdown(false);
                            }
                          }}
                        >
                          <i className={`bi ${notif.type === 'danger' ? 'bi-exclamation-octagon-fill text-danger' : notif.type === 'warning' ? 'bi-exclamation-triangle-fill text-warning' : 'bi-info-circle-fill text-info'} fs-6 mt-0.5`}></i>
                          <div>
                            <div className="fw-semibold" style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                              {notif.message}
                            </div>
                            <span className="text-secondary fs-8 d-block mt-1">{notif.time}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-secondary small">
                        <i className="bi-check-circle-fill text-success fs-3 mb-1.5 d-block"></i>
                        All systems normal.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-light rounded-circle" onClick={toggleTheme} title="Toggle Dark/Light Mode" style={{ width: '40px', height: '40px', padding: 0 }}>
              <i className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'} fs-5`}></i>
            </button>
          </div>
        </header>

        {/* Dynamic Route View */}
        <div className="fade-in-section">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
