import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { drivers as driverApi } from '../services/api';

const Compliance = () => {
  const [driversList, setDriversList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [currentDriver, setCurrentDriver] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await driverApi.getAll({ search });
      if (res.success) {
        setDriversList(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching drivers for compliance audit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [search]);

  // Calculations for compliance metrics
  const totalDrivers = driversList.length;
  const expiredLicenses = driversList.filter(d => new Date(d.licenseExpiryDate) < new Date()).length;
  const criticalSafety = driversList.filter(d => (d.safetyScore || 0) < 70).length;
  
  // Compliance Rate is the average of safety score of every driver who is not suspended
  const nonSuspendedDrivers = driversList.filter(d => d.status !== 'Suspended');
  const complianceRate = nonSuspendedDrivers.length > 0 
    ? Math.round(nonSuspendedDrivers.reduce((acc, d) => acc + (d.safetyScore || 100), 0) / nonSuspendedDrivers.length)
    : 100;

  const handleOpenEdit = (driver) => {
    setCurrentDriver(driver);
    setErrorMessage('');
    setSuccessMessage('');
    setValue('licenseNumber', driver.licenseNumber);
    // Format date string to YYYY-MM-DD for date input
    const formattedDate = driver.licenseExpiryDate ? new Date(driver.licenseExpiryDate).toISOString().split('T')[0] : '';
    setValue('licenseExpiryDate', formattedDate);
    setValue('safetyScore', driver.safetyScore || 100);
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const payload = {
        licenseNumber: data.licenseNumber,
        licenseExpiryDate: data.licenseExpiryDate,
        safetyScore: parseInt(data.safetyScore, 10)
      };

      const res = await driverApi.update(currentDriver._id, payload);
      if (res.success) {
        // Update local state immediately for real-time Compliance Rate recalculation
        setDriversList(prev => prev.map(d => 
          d._id === currentDriver._id 
            ? { ...d, licenseNumber: payload.licenseNumber, licenseExpiryDate: payload.licenseExpiryDate, safetyScore: payload.safetyScore }
            : d
        ));
        
        setSuccessMessage('Compliance metrics updated successfully!');
        setTimeout(() => {
          setModalOpen(false);
        }, 1500);
      } else {
        setErrorMessage(res.message || 'Failed to update compliance details.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Server error occurred during update.');
    } finally {
      setSaving(false);
    }
  };

  const getExpiryBadge = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="badge bg-danger text-white rounded-pill px-2.5 py-1">Expired</span>;
    } else if (diffDays <= 30) {
      return <span className="badge bg-warning text-dark rounded-pill px-2.5 py-1">Expiring in {diffDays} days</span>;
    } else {
      return <span className="badge bg-success text-white rounded-pill px-2.5 py-1">Active</span>;
    }
  };

  const getSafetyScoreColor = (score) => {
    if (score >= 85) return 'text-success fw-bold';
    if (score >= 70) return 'text-warning fw-bold';
    return 'text-danger fw-bold';
  };

  return (
    <div className="container-fluid px-0">
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Compliance &amp; Safety</h2>
          <p className="text-secondary mb-0">Monitor driver license status, update safety scores, and audit risk factors</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Compliance Rate */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 p-3 h-100 kpi-card primary">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-secondary small fw-semibold">Compliance Rate</span>
                <h3 className="metric-value mb-0 mt-1">{complianceRate}%</h3>
              </div>
              <div className="p-2.5 bg-primary bg-opacity-10 text-primary rounded-3">
                <i className="bi-shield-check fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Expired Licenses */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 p-3 h-100 kpi-card danger">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-secondary small fw-semibold">Expired Licenses</span>
                <h3 className="metric-value mb-0 mt-1">{expiredLicenses}</h3>
              </div>
              <div className="p-2.5 bg-danger bg-opacity-10 text-danger rounded-3">
                <i className="bi-exclamation-octagon fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Safety Scores */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 p-3 h-100 kpi-card warning">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-secondary small fw-semibold">Critical Scores (&lt;70)</span>
                <h3 className="metric-value mb-0 mt-1">{criticalSafety}</h3>
              </div>
              <div className="p-2.5 bg-warning bg-opacity-10 text-warning rounded-3">
                <i className="bi-speedometer fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Total Roster Size */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 p-3 h-100 kpi-card secondary">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-secondary small fw-semibold">Total Audited</span>
                <h3 className="metric-value mb-0 mt-1">{totalDrivers}</h3>
              </div>
              <div className="p-2.5 bg-secondary bg-opacity-10 text-secondary rounded-3">
                <i className="bi-people fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roster & Search */}
      <div className="card border-0 p-4">
        <div className="row g-3 mb-4 align-items-center justify-content-between">
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-secondary"><i className="bi-search"></i></span>
              <input 
                type="text" 
                className="form-control border-start-0 bg-light" 
                placeholder="Search driver by name or license..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-5 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Performing compliance audit...</p>
          </div>
        ) : driversList.length > 0 ? (
          <div className="transitops-table-container">
            <table className="table text-nowrap w-100">
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>License Number</th>
                  <th>License Expiration</th>
                  <th>Status</th>
                  <th>Safety Score</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {driversList.map((driver) => (
                  <tr key={driver._id}>
                    <td>
                      <div className="fw-semibold text-dark">{driver.name}</div>
                      <span className="text-muted fs-8">{driver.email}</span>
                    </td>
                    <td><code className="text-secondary">{driver.licenseNumber}</code></td>
                    <td>{new Date(driver.licenseExpiryDate).toLocaleDateString()}</td>
                    <td>{getExpiryBadge(driver.licenseExpiryDate)}</td>
                    <td className={getSafetyScoreColor(driver.safetyScore || 100)}>
                      {driver.safetyScore || 100} / 100
                    </td>
                    <td className="text-end">
                      <button 
                        onClick={() => handleOpenEdit(driver)}
                        className="btn btn-outline-primary btn-sm px-3"
                      >
                        <i className="bi-shield-check me-1"></i> Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-5">
            <i className="bi-shield-slash fs-1 text-muted"></i>
            <p className="mt-3 mb-0 text-secondary">No drivers found matching compliance criteria.</p>
          </div>
        )}
      </div>

      {/* Edit Compliance Details Modal */}
      {modalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Compliance: {currentDriver?.name}</h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="modal-body">
                  {errorMessage && (
                    <div className="alert alert-danger py-2 small" role="alert">
                      <i className="bi-exclamation-triangle-fill me-2"></i> {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="alert alert-success py-2 small" role="alert">
                      <i className="bi-check-circle-fill me-2"></i> {successMessage}
                    </div>
                  )}

                  {/* License Number */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold">License Number</label>
                    <input 
                      type="text" 
                      className={`form-control ${errors.licenseNumber ? 'is-invalid' : ''}`}
                      {...register('licenseNumber', { required: 'License number is required' })}
                    />
                    {errors.licenseNumber && <div className="invalid-feedback">{errors.licenseNumber.message}</div>}
                  </div>

                  {/* Expiration Date */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold">License Expiration Date</label>
                    <input 
                      type="date" 
                      className={`form-control ${errors.licenseExpiryDate ? 'is-invalid' : ''}`}
                      {...register('licenseExpiryDate', { required: 'Expiration date is required' })}
                    />
                    {errors.licenseExpiryDate && <div className="invalid-feedback">{errors.licenseExpiryDate.message}</div>}
                  </div>

                  {/* Safety Score */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold">Safety Score (0 - 100)</label>
                    <input 
                      type="number" 
                      className={`form-control ${errors.safetyScore ? 'is-invalid' : ''}`}
                      {...register('safetyScore', { 
                        required: 'Safety score is required',
                        min: { value: 0, message: 'Score cannot be negative' },
                        max: { value: 100, message: 'Score cannot exceed 100' }
                      })}
                    />
                    {errors.safetyScore && <div className="invalid-feedback">{errors.safetyScore.message}</div>}
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={() => setModalOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Metrics'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compliance;
