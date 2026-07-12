import React, { useState, useEffect } from 'react';
import { vehicles as vehicleApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';

const Vehicles = () => {
  const { hasRole } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  
  // Search, filter, sorting state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(null); // If null -> Create, if object -> Edit
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Deletion confirm modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  const canEdit = hasRole('Fleet Manager');
  const canDelete = hasRole('Fleet Manager');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehicleApi.getAll({
        search,
        status: statusFilter,
        type: typeFilter,
        sortBy,
        sortOrder,
        page,
        limit: 8
      });
      if (res.success) {
        setVehicles(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, statusFilter, typeFilter, sortBy, sortOrder, page]);

  const handleOpenModal = (vehicle = null) => {
    setErrorMessage('');
    setCurrentVehicle(vehicle);
    if (vehicle) {
      // Editing, populate form
      reset(vehicle);
    } else {
      // Creating, reset form
      reset({
        registrationNumber: '',
        name: '',
        model: '',
        type: 'Van',
        maxLoadCapacity: '',
        currentOdometer: '',
        acquisitionCost: '',
        status: 'Available'
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentVehicle(null);
  };

  const onSubmit = async (data) => {
    setErrorMessage('');
    setSaving(true);
    try {
      let res;
      if (currentVehicle) {
        res = await vehicleApi.update(currentVehicle._id, data);
      } else {
        res = await vehicleApi.create(data);
      }
      if (res.success) {
        handleCloseModal();
        fetchVehicles();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Error saving vehicle records.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      const res = await vehicleApi.delete(vehicleToDelete._id);
      if (res.success) {
        setDeleteConfirmOpen(false);
        setVehicleToDelete(null);
        fetchVehicles();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete vehicle.');
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Vehicles Registry</h2>
          <p className="text-secondary mb-0">Manage fleet assets, configurations, and lifecycle status</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => handleOpenModal()} 
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <i className="bi-plus-lg"></i> Add New Vehicle
          </button>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="card transitops-card p-3 mb-4">
        <div className="row g-3">
          {/* Search */}
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-light text-muted border-end-0"><i className="bi-search"></i></span>
              <input 
                type="text" 
                className="form-control bg-light border-start-0" 
                placeholder="Search registration, name, model..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="col-6 col-md-3">
            <select 
              className="form-select bg-light"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="In Shop">In Shop</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="col-6 col-md-3">
            <select 
              className="form-select bg-light"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              <option value="Van">Van</option>
              <option value="Sprinter">Sprinter</option>
              <option value="Semi">Semi</option>
              <option value="Truck">Truck</option>
              <option value="Cargo Van">Cargo Van</option>
              <option value="Flatbed">Flatbed</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="col-12 col-md-2">
            <button 
              className="btn btn-outline-secondary w-100"
              onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setPage(1); }}
            >
              <i className="bi-x-circle me-1"></i> Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Vehicles Table */}
      <div className="card transitops-card p-4">
        {loading ? (
          <div className="py-5 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Fetching fleet assets...</p>
          </div>
        ) : vehicles.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table transitops-table text-nowrap w-100">
                <thead>
                  <tr style={{ cursor: 'pointer' }}>
                    <th onClick={() => handleSort('registrationNumber')}>Reg. Number {sortBy === 'registrationNumber' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    <th onClick={() => handleSort('name')}>Vehicle Model {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    <th onClick={() => handleSort('type')}>Type {sortBy === 'type' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    <th onClick={() => handleSort('maxLoadCapacity')}>Load Capacity {sortBy === 'maxLoadCapacity' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    <th onClick={() => handleSort('currentOdometer')}>Odometer {sortBy === 'currentOdometer' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    <th onClick={() => handleSort('acquisitionCost')}>Acq. Cost {sortBy === 'acquisitionCost' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    <th onClick={() => handleSort('status')}>Status {sortBy === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    {canEdit && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v._id}>
                      <td className="fw-bold text-dark">{v.registrationNumber}</td>
                      <td>
                        <div className="fw-semibold">{v.name}</div>
                        <span className="text-muted fs-8">{v.model}</span>
                      </td>
                      <td>{v.type}</td>
                      <td>{v.maxLoadCapacity.toLocaleString()} kg</td>
                      <td>{v.currentOdometer.toLocaleString()} km</td>
                      <td>${v.acquisitionCost.toLocaleString()}</td>
                      <td>
                        <span className={`badge-status ${v.status.toLowerCase().replace(/\s+/g, '')}`}>
                          {v.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="text-end">
                          <button 
                            onClick={() => handleOpenModal(v)} 
                            className="btn btn-outline-primary btn-sm me-2 rounded-circle"
                            title="Edit Vehicle"
                          >
                            <i className="bi-pencil"></i>
                          </button>
                          {canDelete && (
                            <button 
                              onClick={() => handleDeleteClick(v)} 
                              className="btn btn-outline-danger btn-sm rounded-circle"
                              title="Delete Vehicle"
                              disabled={v.status === 'On Trip'}
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

            {/* Pagination controls */}
            {pagination.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-4 border-top pt-3">
                <span className="small text-muted">
                  Showing {vehicles.length} of {pagination.totalResults} results (Page {pagination.currentPage} of {pagination.totalPages})
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
            No vehicles match the selected search or filters.
          </div>
        )}
      </div>

      {/* CRUD Edit/Create Modal */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">{currentVehicle ? 'Edit Vehicle Records' : 'Register New Vehicle'}</h5>
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
                    {/* Reg Number */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Registration Number</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.registrationNumber ? 'is-invalid' : ''}`}
                        placeholder="e.g. TO-101"
                        {...register('registrationNumber', { 
                          required: 'Registration number is required',
                          pattern: { value: /^[A-Z0-9-]+$/i, message: 'Alphanumeric characters only' }
                        })}
                      />
                      {errors.registrationNumber && <div className="text-danger small mt-0.5">{errors.registrationNumber.message}</div>}
                    </div>

                    {/* Name */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Vehicle Name</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                        placeholder="e.g. Ford Transit"
                        {...register('name', { required: 'Vehicle name is required' })}
                      />
                      {errors.name && <div className="text-danger small mt-0.5">{errors.name.message}</div>}
                    </div>

                    {/* Model */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Model</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.model ? 'is-invalid' : ''}`}
                        placeholder="e.g. Transit 350"
                        {...register('model', { required: 'Model is required' })}
                      />
                      {errors.model && <div className="text-danger small mt-0.5">{errors.model.message}</div>}
                    </div>

                    {/* Type */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Vehicle Type</label>
                      <select className="form-select" {...register('type', { required: true })}>
                        <option value="Van">Van</option>
                        <option value="Sprinter">Sprinter</option>
                        <option value="Semi">Semi</option>
                        <option value="Truck">Truck</option>
                        <option value="Cargo Van">Cargo Van</option>
                        <option value="Flatbed">Flatbed</option>
                      </select>
                    </div>

                    {/* Max Load Capacity */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Max Load Capacity (kg)</label>
                      <input 
                        type="number" 
                        className={`form-control ${errors.maxLoadCapacity ? 'is-invalid' : ''}`}
                        placeholder="e.g. 1500"
                        {...register('maxLoadCapacity', { 
                          required: 'Load capacity is required',
                          min: { value: 1, message: 'Must be greater than 0' }
                        })}
                      />
                      {errors.maxLoadCapacity && <div className="text-danger small mt-0.5">{errors.maxLoadCapacity.message}</div>}
                    </div>

                    {/* Current Odometer */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Current Odometer (km)</label>
                      <input 
                        type="number" 
                        className={`form-control ${errors.currentOdometer ? 'is-invalid' : ''}`}
                        placeholder="e.g. 12000"
                        {...register('currentOdometer', { 
                          required: 'Odometer is required',
                          min: { value: 0, message: 'Cannot be negative' }
                        })}
                      />
                      {errors.currentOdometer && <div className="text-danger small mt-0.5">{errors.currentOdometer.message}</div>}
                    </div>

                    {/* Acquisition Cost */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Acquisition Cost ($)</label>
                      <input 
                        type="number" 
                        className={`form-control ${errors.acquisitionCost ? 'is-invalid' : ''}`}
                        placeholder="e.g. 45000"
                        {...register('acquisitionCost', { 
                          required: 'Acquisition cost is required',
                          min: { value: 0, message: 'Cannot be negative' }
                        })}
                      />
                      {errors.acquisitionCost && <div className="text-danger small mt-0.5">{errors.acquisitionCost.message}</div>}
                    </div>

                    {/* Status */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Status</label>
                      <select 
                        className="form-select" 
                        {...register('status', { required: true })}
                        disabled={currentVehicle && currentVehicle.status === 'On Trip'} // Cannot change status if vehicle is currently on trip
                      >
                        <option value="Available">Available</option>
                        <option value="On Trip" disabled>On Trip</option>
                        <option value="In Shop">In Shop</option>
                        <option value="Retired">Retired</option>
                      </select>
                      {currentVehicle && currentVehicle.status === 'On Trip' && (
                        <div className="text-muted fs-8 mt-1">Vehicle is active on a trip. Finish the trip to restore status.</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Records'}
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
                <h5 className="fw-bold mb-2">Delete Vehicle?</h5>
                <p className="text-secondary small mb-4">Are you sure you want to delete vehicle <strong>{vehicleToDelete?.registrationNumber}</strong>? This action cannot be undone.</p>
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

export default Vehicles;
