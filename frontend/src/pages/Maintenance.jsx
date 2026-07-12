import React, { useState, useEffect } from 'react';
import { maintenance as maintApi, vehicles as vehicleApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';

const Maintenance = () => {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  // Search/filter
  const [search, setSearch] = useState('');

  const canEdit = hasRole('Fleet Manager');
  const canDelete = hasRole('Fleet Manager');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      vehicle: '',
      maintenanceType: 'Oil Change',
      cost: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Active',
      description: ''
    }
  });

  const watchedStatus = watch('status');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await maintApi.getAll({ limit: 100 });
      if (res.success) setLogs(res.data);
    } catch (err) {
      console.error('Error fetching maintenance records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await vehicleApi.getAll({ limit: 100 });
      if (res.success) setVehicles(res.data.filter(v => v.status !== 'Retired'));
    } catch (err) {
      console.error('Error loading vehicles:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchVehicles();
  }, []);

  // Reset to blank create form
  const handleReset = () => {
    setSelectedLog(null);
    setErrorMessage('');
    setSuccessMessage('');
    reset({
      vehicle: '',
      maintenanceType: 'Oil Change',
      cost: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Active',
      description: ''
    });
  };

  // Click a row → load into form
  const handleRowClick = (log) => {
    setSelectedLog(log);
    setErrorMessage('');
    setSuccessMessage('');
    reset({
      vehicle: log.vehicle?._id || '',
      maintenanceType: log.maintenanceType,
      cost: log.cost,
      date: log.date ? new Date(log.date).toISOString().split('T')[0] : '',
      status: log.status,
      description: log.description || ''
    });
  };

  const onSubmit = async (data) => {
    setErrorMessage('');
    setSuccessMessage('');
    setSaving(true);
    try {
      let res;
      if (selectedLog) {
        res = await maintApi.update(selectedLog._id, data);
      } else {
        res = await maintApi.create(data);
      }
      if (res.success) {
        setSuccessMessage(selectedLog ? 'Record updated successfully.' : 'Maintenance record logged.');
        handleReset();
        fetchLogs();
        fetchVehicles();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Error processing maintenance log.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (e, log) => {
    e.stopPropagation();
    setLogToDelete(log);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!logToDelete) return;
    try {
      const res = await maintApi.delete(logToDelete._id);
      if (res.success) {
        setDeleteConfirmOpen(false);
        setLogToDelete(null);
        if (selectedLog?._id === logToDelete._id) handleReset();
        fetchLogs();
        fetchVehicles();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete maintenance log.');
    }
  };

  // Filtered logs for the right panel
  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.vehicle?.registrationNumber?.toLowerCase().includes(q) ||
      log.maintenanceType?.toLowerCase().includes(q) ||
      log.status?.toLowerCase().includes(q)
    );
  });

  // Status badge helper matching reference image
  const getStatusBadge = (status) => {
    if (status === 'Active') return (
      <span style={{
        backgroundColor: '#e8820c',
        color: '#fff',
        padding: '3px 14px',
        borderRadius: '4px',
        fontWeight: 600,
        fontSize: '0.78rem',
        letterSpacing: '0.02em'
      }}>In Shop</span>
    );
    return (
      <span style={{
        backgroundColor: '#28a745',
        color: '#fff',
        padding: '3px 14px',
        borderRadius: '4px',
        fontWeight: 600,
        fontSize: '0.78rem',
        letterSpacing: '0.02em'
      }}>Completed</span>
    );
  };

  const isReadOnly = selectedLog && false; // Always editable when selected

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Maintenance</h2>
        <p className="text-secondary mb-0">Schedule tune-ups, log repairs, and monitor workshop cycles</p>
      </div>

      <div className="row g-4">
        {/* ===== LEFT PANEL: LOG SERVICE RECORD ===== */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 p-4 h-100">
            {/* Panel header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 className="fw-bold mb-0 text-uppercase" style={{ letterSpacing: '0.08em', fontSize: '0.95rem' }}>
                {selectedLog ? 'Edit Service Record' : 'Log Service Record'}
              </h5>
              {selectedLog && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-sm btn-outline-secondary"
                  title="New Record"
                >
                  <i className="bi-plus-lg me-1"></i>New
                </button>
              )}
            </div>

            {/* Alerts */}
            {errorMessage && (
              <div className="alert alert-danger py-2 small mb-3">
                <i className="bi-exclamation-triangle-fill me-1"></i> {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="alert alert-success py-2 small mb-3">
                <i className="bi-check-circle-fill me-1"></i> {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Vehicle */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold text-uppercase" style={{ letterSpacing: '0.05em', fontSize: '0.7rem' }}>Vehicle</label>
                {selectedLog ? (
                  <input
                    type="text"
                    className="form-control"
                    value={`${selectedLog.vehicle?.registrationNumber || ''} – ${selectedLog.vehicle?.name || ''}`}
                    disabled
                  />
                ) : (
                  <select
                    className={`form-select ${errors.vehicle ? 'is-invalid' : ''}`}
                    disabled={!canEdit || saving}
                    {...register('vehicle', { required: 'Please select a vehicle' })}
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>
                        {v.registrationNumber} – {v.name} [{v.status}]
                      </option>
                    ))}
                  </select>
                )}
                {errors.vehicle && <div className="invalid-feedback">{errors.vehicle.message}</div>}
              </div>

              {/* Service Type */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold text-uppercase" style={{ letterSpacing: '0.05em', fontSize: '0.7rem' }}>Service Type</label>
                <select
                  className="form-select"
                  disabled={!canEdit || saving}
                  {...register('maintenanceType', { required: true })}
                >
                  <option value="Oil Change">Oil Change</option>
                  <option value="Engine Repair">Engine Repair</option>
                  <option value="Tyre Replace">Tyre Replace</option>
                  <option value="Brake Repair">Brake Repair</option>
                  <option value="General Maintenance">General Maintenance</option>
                  <option value="Transmission Service">Transmission Service</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Engine Tune-up">Engine Tune-up</option>
                </select>
              </div>

              {/* Cost */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold text-uppercase" style={{ letterSpacing: '0.05em', fontSize: '0.7rem' }}>Cost (₹)</label>
                <input
                  type="number"
                  className={`form-control ${errors.cost ? 'is-invalid' : ''}`}
                  placeholder="e.g. 2500"
                  disabled={!canEdit || saving}
                  {...register('cost', {
                    required: 'Cost is required',
                    min: { value: 0, message: 'Cannot be negative' }
                  })}
                />
                {errors.cost && <div className="invalid-feedback">{errors.cost.message}</div>}
              </div>

              {/* Date */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold text-uppercase" style={{ letterSpacing: '0.05em', fontSize: '0.7rem' }}>Date</label>
                <input
                  type="date"
                  className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                  disabled={!canEdit || saving}
                  {...register('date', { required: 'Date is required' })}
                />
                {errors.date && <div className="invalid-feedback">{errors.date.message}</div>}
              </div>

              {/* Status */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold text-uppercase" style={{ letterSpacing: '0.05em', fontSize: '0.7rem' }}>Status</label>
                <select
                  className="form-select"
                  disabled={!canEdit || saving}
                  {...register('status', { required: true })}
                >
                  <option value="Active">Active (In Shop)</option>
                  <option value="Closed">Closed (Completed)</option>
                </select>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="form-label text-secondary small fw-semibold text-uppercase" style={{ letterSpacing: '0.05em', fontSize: '0.7rem' }}>Description</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="e.g. Replaced worn brake pads, topped up transmission fluid..."
                  disabled={!canEdit || saving}
                  {...register('description')}
                />
              </div>

              {/* Save Button */}
              {canEdit && (
                <button
                  type="submit"
                  className="btn btn-warning w-100 fw-bold text-white py-2"
                  style={{ backgroundColor: '#e8820c', border: 'none', letterSpacing: '0.05em' }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </form>

            {/* Status Transition Notes */}
            <div className="mt-4 pt-3 border-top">
              {/* Available → In Shop */}
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fw-semibold" style={{ color: '#28a745', minWidth: '76px' }}>Available</span>
                <div className="d-flex align-items-center flex-grow-1 position-relative mx-1">
                  <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }}></div>
                  <span className="text-secondary" style={{ fontSize: '0.68rem', position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '-9px', whiteSpace: 'nowrap', background: 'var(--card-bg)', padding: '0 4px' }}>creating active record</span>
                  <i className="bi-arrow-right text-secondary" style={{ fontSize: '0.8rem' }}></i>
                </div>
                <span className="fw-semibold" style={{ color: '#e8820c', minWidth: '58px', textAlign: 'right' }}>In Shop</span>
              </div>

              {/* In Shop → Available */}
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="fw-semibold" style={{ color: '#e8820c', minWidth: '76px' }}>In Shop</span>
                <div className="d-flex align-items-center flex-grow-1 position-relative mx-1">
                  <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }}></div>
                  <span className="text-secondary" style={{ fontSize: '0.68rem', position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '-9px', whiteSpace: 'nowrap', background: 'var(--card-bg)', padding: '0 4px' }}>closing record / not retired</span>
                  <i className="bi-arrow-right text-secondary" style={{ fontSize: '0.8rem' }}></i>
                </div>
                <span className="fw-semibold" style={{ color: '#28a745', minWidth: '58px', textAlign: 'right' }}>Available</span>
              </div>

              {/* Note */}
              <p className="mb-0" style={{ color: '#e8820c', fontSize: '0.78rem', fontWeight: 500 }}>
                Note: In Shop vehicles are removed from the dispatch pool.
              </p>
            </div>
          </div>
        </div>

        {/* ===== RIGHT PANEL: SERVICE LOG ===== */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 p-4 h-100">
            {/* Header with search and plus */}
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0 text-uppercase" style={{ letterSpacing: '0.08em', fontSize: '0.95rem' }}>Service Log</h5>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="text"
                  className="form-control form-control-sm bg-light border-0"
                  placeholder="Search logs..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '160px' }}
                />
                {canEdit && (
                  <button
                    onClick={handleReset}
                    className="btn btn-primary btn-sm d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: '30px', height: '30px', padding: 0 }}
                    title="New Log"
                  >
                    <i className="bi-plus-lg fs-6"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-2">Loading logs...</p>
              </div>
            ) : filteredLogs.length > 0 ? (
              <div className="table-responsive" style={{ maxHeight: '580px', overflowY: 'auto' }}>
                <table className="table transitops-table text-nowrap w-100">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Service</th>
                      <th>Cost</th>
                      <th>Status</th>
                      {canDelete && <th className="text-end">Del</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr
                        key={log._id}
                        onClick={() => handleRowClick(log)}
                        style={{
                          cursor: 'pointer',
                          background: selectedLog?._id === log._id ? 'var(--hover-bg, rgba(13,110,253,0.06))' : undefined,
                          outline: selectedLog?._id === log._id ? '1.5px solid var(--primary, #0d6efd)' : undefined,
                          transition: 'background 0.15s'
                        }}
                      >
                        <td>
                          <div className="fw-bold text-dark">{log.vehicle?.registrationNumber}</div>
                          <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{log.vehicle?.name}</span>
                        </td>
                        <td className="fw-semibold">{log.maintenanceType}</td>
                        <td>₹{log.cost?.toLocaleString('en-IN')}</td>
                        <td>{getStatusBadge(log.status)}</td>
                        {canDelete && (
                          <td className="text-end">
                            <button
                              onClick={(e) => handleDeleteClick(e, log)}
                              className="btn btn-outline-danger btn-sm rounded-circle"
                              title="Delete"
                              style={{ width: '28px', height: '28px', padding: 0 }}
                            >
                              <i className="bi-trash" style={{ fontSize: '0.75rem' }}></i>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi-tools fs-2 mb-2 d-block"></i>
                No maintenance records found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-body p-4 text-center">
                <i className="bi-exclamation-triangle-fill text-danger fs-1 mb-3 d-block"></i>
                <h5 className="fw-bold mb-2">Delete Log?</h5>
                <p className="text-secondary small mb-4">This will permanently remove the maintenance record. The associated vehicle status may be restored.</p>
                <div className="d-flex justify-content-center gap-2">
                  <button type="button" className="btn btn-light" onClick={() => setDeleteConfirmOpen(false)}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={confirmDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
