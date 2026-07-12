import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
        <header className="d-none d-lg-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div>
            <h4 className="fw-semibold mb-0">Smart Transport Operations</h4>
            <small className="text-muted">Logged in as {user?.role}</small>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted fs-7">
              <i className="bi-calendar-check me-1"></i> {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <button className="btn btn-light rounded-circle" onClick={toggleTheme} title="Toggle Dark/Light Mode">
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
