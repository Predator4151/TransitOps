import React from 'react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1">System Settings</h2>
        <p className="text-secondary mb-0">Manage user configuration, roles, and profile details</p>
      </div>

      <div className="row g-4">
        {/* Profile Card */}
        <div className="col-12 col-lg-6">
          <div className="card transitops-card p-4">
            <h5 className="fw-bold mb-4"><i className="bi-person-badge-fill text-primary me-2"></i> User Profile Details</h5>
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold fs-3 shadow" style={{ width: '70px', height: '70px' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="fw-bold text-dark mb-1">{user?.name}</h4>
                <span className="badge bg-primary px-3 py-1.5 fs-8 rounded-pill">{user?.role}</span>
              </div>
            </div>

            <div className="d-flex flex-column gap-3 border-top pt-4">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-secondary fw-medium">Email Address</span>
                <span className="text-dark fw-semibold">{user?.email}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-secondary fw-medium">Access Permissions</span>
                <span className="text-success fw-semibold"><i className="bi-shield-fill-check me-1"></i> Authorized Roles</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-secondary fw-medium">Session Token Status</span>
                <span className="badge bg-light text-dark border"><i className="bi-key-fill text-warning me-1"></i> JWT Signed (30d)</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Specs */}
        <div className="col-12 col-lg-6">
          <div className="card transitops-card p-4">
            <h5 className="fw-bold mb-4"><i className="bi-cpu-fill text-warning me-2"></i> Application Status</h5>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-secondary fw-medium">Backend Version</span>
                <span className="text-dark fw-semibold">1.0.0 (Node/Express)</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-secondary fw-medium">Frontend Scaffolding</span>
                <span className="text-dark fw-semibold">React 19.x / Vite / Bootstrap 5</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-secondary fw-medium">Database Node</span>
                <span className="text-dark fw-semibold">MongoDB (Active Localhost)</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-secondary fw-medium">Platform Env</span>
                <span className="badge bg-success-subtle text-success border border-success border-opacity-25 px-2.5 py-1">Demo Sandboxed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
