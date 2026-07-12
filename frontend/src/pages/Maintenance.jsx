import React, { useState, useEffect } from 'react';
import { maintenance as maintApi, vehicles as vehicleApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';

const Maintenance = () => {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [vehicles, setVehicles] = useState([]);

  // Search/Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Deletion state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  const canEdit = hasRole(['Fleet Manager', 'Dispatcher']);
  const canDelete = hasRole('Fleet Manager');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await maintApi.getAll({
        status: statusFilter,
        vehicle: vehicleFilter,
        page,
        limit: 8
      });
      if (res.success) {
        setLogs(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching maintenance records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      // Get vehicles list for dropdown (excluding retired vehicles)
      const res = await vehicleApi.getAll({ limit: 100 });
      if (res.success) {
        setVehicles(res.data.filter(v => v.status !== 'Retired'));
      }
    } catch (err) {
      console.error('Error loading vehicles:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, vehicleFilter, page]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenModal = (log = null) => {
    setErrorMessage('');
    setCurrentLog(log);
    fetchVehicles(); // refresh vehicles dropdown list

    if (log) {
      const formattedDate = log.date 
        ? new Date(log.date).toISOString().split('T')[0] 
        : '';
      reset({
        vehicle: log.vehicle?._id || '',
        maintenanceType: log.maintenanceType,
        description: log.description,
        date: formattedDate,
        cost: log.cost,
        status: log.status
      });
    } else {
      reset({
        vehicle: '',
        maintenanceType: 'General Maintenance',
        description: '',
        date: new Date().toISOString().split('T')[0],
        cost: '',
        status: 'Active'
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentLog(null);
  };

  const onSubmit = async (data) => {
    setErrorMessage('');
    setSaving(true);
    try {
      let res;
      if (currentLog) {
        res = await maintApi.update(currentLog._id, data);
      } else {
        res = await maintApi.create(data);
      }
      if (res.success) {
        handleCloseModal();
        fetchLogs();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Error processing maintenance log.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseMaintenance = async (log) => {
    if (!window.confirm(`Are you sure you want to close maintenance for vehicle ${log.vehicle?.registrationNumber}?`)) return;
    try {
      const res = await maintApi.update(log._id, { status: 'Closed' });
      if (res.success) {
        fetchLogs();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close maintenance.');
    }
  };

  const handleDeleteClick = (log) => {
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
        fetchLogs();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete maintenance log.');
    }
  };

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Maintenance Logs</h2>
          <p className="text-secondary mb-0">Schedule tune-ups, log repairs, and monitor workshop cycles</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => handleOpenModal()} 
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <i className="bi-plus-lg"></i> Schedule Maintenance
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card transitops-card p-3 mb-4">
        <div className="row g-3">
          <div className="col-6 col-md-4">
            <select 
              className="form-select bg-light"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active (In Shop)</option>
              <option value="Closed">Closed (Completed)</option>
            </select>
          </div>
          <div className="col-6 col-md-4">
            <select 
              className="form-select bg-light"
              value={vehicleFilter}
              onChange={(e) => { setVehicleFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v._id} value={v._id}>{v.registrationNumber} - {v.name}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <button 
              className="btn btn-outline-secondary w-100"
              onClick={() => { setStatusFilter(''); setVehicleFilter(''); setPage(1); }}
            >
              <i className="bi-x-circle me-1"></i> Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="card transitops-card p-4">
        {loading ? (
          <div className="py-5 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Loading logs...</p>
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table transitops-table text-nowrap w-100">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Maintenance Type</th>
                    <th>Description</th>
                    <th>Scheduled Date</th>
                    <th>Cost</th>
                    <th>Status</th>
                    {canEdit && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>
                        <div className="fw-bold text-dark">{log.vehicle?.registrationNumber}</div>
                        <span className="text-secondary fs-8">{log.vehicle?.name}</span>
                      </td>
                      <td className="fw-semibold text-dark">{log.maintenanceType}</td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '240px' }} title={log.description}>
                          {log.description}
                        </div>
                      </td>
                      <td>{new Date(log.date).toLocaleDateString()}</td>
                      <td>${log.cost.toLocaleString()}</td>
                      <td>
                        <span className={`badge-status ${log.status === 'Active' ? 'inshop' : 'available'}`}>
                          {log.status === 'Active' ? 'Active' : 'Closed'}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="text-end">
                          {log.status === 'Active' && (
                            <button 
                              onClick={() => handleCloseMaintenance(log)} 
                              className="btn btn-outline-success btn-sm me-2"
                              title="Mark as Completed"
                            >
                              <i className="bi-check2-circle me-1"></i> Complete
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenModal(log)} 
                            className="btn btn-outline-primary btn-sm me-2 rounded-circle"
                            title="Edit Details"
                          >
                            <i className="bi-pencil"></i>
                          </button>
                          {canDelete && (
                            <button 
                              onClick={() => handleDeleteClick(log)} 
                              className="btn btn-outline-danger btn-sm rounded-circle"
                              title="Delete Entry"
                            >
                              <i className="bi-trash"></i>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-4 border-top pt-3">
                <span className="small text-muted">
                  Showing {logs.length} of {pagination.totalResults} results (Page {pagination.currentPage} of {pagination.totalPages})
                </span>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(prev => prev - 1)}>Previous</button>
                    </li>
                    {[...Array(pagination.totalPages)].map((_, idx) => (
                      <li key={idx} className={`page-item ${pagination.currentPage === idx + 1 ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setPage(idx + 1)}>{idx + 1}</button>
                      </li>
                    ))}
                    <li className={`page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(prev => prev + 1)}>Next</button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-5 text-muted">
            <i className="bi-info-circle fs-2 mb-2 d-block"></i>
            No maintenance records registered.
          </div>
        )}
      </div>

      {/* CRUD Edit/Create Modal */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">{currentLog ? 'Edit Maintenance Record' : 'Schedule Vehicle Maintenance'}</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="modal-body py-3">
                  {errorMessage && (
                    <div className="alert alert-danger py-2 small" role="alert">
                      <i className="bi-exclamation-triangle-fill me-1"></i> {errorMessage}
                    </div>
                  )}

                  <div className="row g-3">
                    {/* Vehicle */}
                    <div className="col-12">
                      <label className="form-label text-secondary small fw-medium">Vehicle</label>
                      <select 
                        className={`form-select ${errors.vehicle ? 'is-invalid' : ''}`}
                        {...register('vehicle', { required: 'Please select a vehicle' })}
                        disabled={!!currentLog} // Lock vehicle if editing
                      >
                        <option value="">-- Select Vehicle --</option>
                        {vehicles.map(v => (
                          <option key={v._id} value={v._id}>
                            {v.registrationNumber} - {v.name} ({v.type}) [Status: {v.status}]
                          </option>
                        ))}
                      </select>
                      {errors.vehicle && <div className="text-danger small mt-0.5">{errors.vehicle.message}</div>}
                    </div>

                    {/* Maintenance Type */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Maintenance Type</label>
                      <select className="form-select" {...register('maintenanceType', { required: true })}>
                        <option value="General Maintenance">General Maintenance</option>
                        <option value="Routine Oil Change">Routine Oil Change</option>
                        <option value="Tire Rotation">Tire Rotation</option>
                        <option value="Brake Repair">Brake Repair</option>
                        <option value="Engine Tune-up">Engine Tune-up</option>
                        <option value="Transmission Service">Transmission Service</option>
                        <option value="Inspection">Inspection</option>
                      </select>
                    </div>

                    {/* Date */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Date</label>
                      <input 
                        type="date" 
                        className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                        {...register('date', { required: 'Date is required' })}
                      />
                      {errors.date && <div className="text-danger small mt-0.5">{errors.date.message}</div>}
                    </div>

                    {/* Cost */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Cost ($)</label>
                      <input 
                        type="number" 
                        className={`form-control ${errors.cost ? 'is-invalid' : ''}`}
                        placeholder="e.g. 250"
                        {...register('cost', { 
                          required: 'Cost is required',
                          min: { value: 0, message: 'Cannot be negative' }
                        })}
                      />
                      {errors.cost && <div className="text-danger small mt-0.5">{errors.cost.message}</div>}
                    </div>

                    {/* Status */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Status</label>
                      <select className="form-select" {...register('status', { required: true })}>
                        <option value="Active">Active (In Shop)</option>
                        <option value="Closed">Closed (Completed)</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div className="col-12">
                      <label className="form-label text-secondary small fw-medium">Work Description</label>
                      <textarea 
                        className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                        rows="3"
                        placeholder="e.g. Replaced worn brake pads, topped up transmission fluid..."
                        {...register('description', { required: 'Please provide description of maintenance' })}
                      />
                      {errors.description && <div className="text-danger small mt-0.5">{errors.description.message}</div>}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-body p-4 text-center">
                <i className="bi-exclamation-triangle-fill text-danger fs-1 mb-3 d-block"></i>
                <h5 className="fw-bold mb-2">Delete Log?</h5>
                <p className="text-secondary small mb-4">Are you sure you want to remove this maintenance entry? Associated vehicle status may be restored.</p>
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
