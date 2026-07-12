import React, { useState, useEffect } from 'react';
import { fuel as fuelApi, vehicles as vehicleApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';

const FuelLogs = () => {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [vehicles, setVehicles] = useState([]);

  // Search/Filter state
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

  const canEdit = hasRole('Financial Analyst');
  const canDelete = hasRole('Financial Analyst');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fuelApi.getAll({
        vehicle: vehicleFilter,
        page,
        limit: 8
      });
      if (res.success) {
        setLogs(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching fuel logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
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
  }, [vehicleFilter, page]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenModal = (log = null) => {
    setErrorMessage('');
    setCurrentLog(log);
    fetchVehicles();

    if (log) {
      const formattedDate = log.date 
        ? new Date(log.date).toISOString().split('T')[0] 
        : '';
      reset({
        vehicle: log.vehicle?._id || '',
        date: formattedDate,
        fuelQuantity: log.fuelQuantity,
        fuelCost: log.fuelCost,
        distanceCovered: log.distanceCovered
      });
    } else {
      reset({
        vehicle: '',
        date: new Date().toISOString().split('T')[0],
        fuelQuantity: '',
        fuelCost: '',
        distanceCovered: ''
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
        res = await fuelApi.update(currentLog._id, data);
      } else {
        res = await fuelApi.create(data);
      }
      if (res.success) {
        handleCloseModal();
        fetchLogs();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Error saving fuel logs.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (log) => {
    setLogToDelete(log);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!logToDelete) return;
    try {
      const res = await fuelApi.delete(logToDelete._id);
      if (res.success) {
        setDeleteConfirmOpen(false);
        setLogToDelete(null);
        fetchLogs();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete fuel log.');
    }
  };

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Fuel Logbook</h2>
          <p className="text-secondary mb-0">Record refueling stats, calculate efficiency, and log costs</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => handleOpenModal()} 
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <i className="bi-plus-lg"></i> Record Fuel Purchase
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="card transitops-card p-3 mb-4">
        <div className="row g-3">
          <div className="col-12 col-md-8">
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
              onClick={() => { setVehicleFilter(''); setPage(1); }}
            >
              <i className="bi-x-circle me-1"></i> Clear Filter
            </button>
          </div>
        </div>
      </div>

      {/* Fuel Logs List */}
      <div className="card transitops-card p-4">
        {loading ? (
          <div className="py-5 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Loading refuel entries...</p>
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table transitops-table text-nowrap w-100">
                <thead>
                  <tr>
                    <th>Refuel Date</th>
                    <th>Vehicle</th>
                    <th>Fuel Quantity</th>
                    <th>Fuel Cost</th>
                    <th>Distance Covered</th>
                    <th>Fuel Efficiency</th>
                    {canEdit && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>{new Date(log.date).toLocaleDateString()}</td>
                      <td>
                        <div className="fw-bold text-dark">{log.vehicle?.registrationNumber}</div>
                        <span className="text-secondary fs-8">{log.vehicle?.name}</span>
                      </td>
                      <td>{log.fuelQuantity} L</td>
                      <td>₹{log.fuelCost.toLocaleString('en-IN')}</td>
                      <td>{log.distanceCovered} km</td>
                      <td>
                        <span className="badge bg-success bg-opacity-10 text-success fw-bold p-2 fs-8 rounded">
                          {log.fuelEfficiency ? `${log.fuelEfficiency} km/L` : '0.00 km/L'}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="text-end">
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
            No fuel logs registered.
          </div>
        )}
      </div>

      {/* CRUD Edit/Create Modal */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">{currentLog ? 'Edit Fuel Purchase Details' : 'Record Refuel Transaction'}</h5>
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
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Vehicle</label>
                      <select 
                        className={`form-select ${errors.vehicle ? 'is-invalid' : ''}`}
                        {...register('vehicle', { required: 'Please select a vehicle' })}
                        disabled={!!currentLog}
                      >
                        <option value="">-- Select Vehicle --</option>
                        {vehicles.map(v => (
                          <option key={v._id} value={v._id}>
                            {v.registrationNumber} - {v.name}
                          </option>
                        ))}
                      </select>
                      {errors.vehicle && <div className="text-danger small mt-0.5">{errors.vehicle.message}</div>}
                    </div>

                    {/* Date */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Purchase Date</label>
                      <input 
                        type="date" 
                        className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                        {...register('date', { required: 'Date is required' })}
                      />
                      {errors.date && <div className="text-danger small mt-0.5">{errors.date.message}</div>}
                    </div>

                    {/* Quantity */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Fuel Quantity (Liters)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className={`form-control ${errors.fuelQuantity ? 'is-invalid' : ''}`}
                        placeholder="e.g. 65"
                        {...register('fuelQuantity', { 
                          required: 'Quantity is required',
                          min: { value: 0.1, message: 'Must be greater than 0' }
                        })}
                      />
                      {errors.fuelQuantity && <div className="text-danger small mt-0.5">{errors.fuelQuantity.message}</div>}
                    </div>

                    {/* Cost */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Total Cost ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className={`form-control ${errors.fuelCost ? 'is-invalid' : ''}`}
                        placeholder="e.g. 9425"
                        {...register('fuelCost', { 
                          required: 'Total cost is required',
                          min: { value: 0, message: 'Cannot be negative' }
                        })}
                      />
                      {errors.fuelCost && <div className="text-danger small mt-0.5">{errors.fuelCost.message}</div>}
                    </div>

                    {/* Distance Covered */}
                    <div className="col-12">
                      <label className="form-label text-secondary small fw-medium">Distance Covered (km)</label>
                      <input 
                        type="number" 
                        className={`form-control ${errors.distanceCovered ? 'is-invalid' : ''}`}
                        placeholder="e.g. 520"
                        {...register('distanceCovered', { 
                          required: 'Distance is required',
                          min: { value: 0, message: 'Cannot be negative' }
                        })}
                      />
                      {errors.distanceCovered && <div className="text-danger small mt-0.5">{errors.distanceCovered.message}</div>}
                    </div>
                  </div>
                  <div className="text-muted fs-8 mt-3">
                    <i className="bi-info-circle me-1"></i> Saving this refuel transaction will automatically log a corresponding Fuel Expense for analytics.
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Log'}
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
                <h5 className="fw-bold mb-2">Delete Refuel Log?</h5>
                <p className="text-secondary small mb-4">Are you sure you want to remove this refueling entry? The associated Expense record will also be deleted.</p>
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

export default FuelLogs;
