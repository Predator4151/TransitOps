import React, { useState, useEffect } from 'react';
import { drivers as driverApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';

const Drivers = () => {
  const { hasRole } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  
  // Search, filter, sorting state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [currentDriver, setCurrentDriver] = useState(null); // If null -> Create, if object -> Edit
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Deletion confirm modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState(null);

  const canEdit = hasRole(['Fleet Manager', 'Dispatcher', 'Safety Officer']);
  const canDelete = hasRole('Fleet Manager');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await driverApi.getAll({
        search,
        status: statusFilter,
        sortBy,
        sortOrder,
        page,
        limit: 8
      });
      if (res.success) {
        setDrivers(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [search, statusFilter, sortBy, sortOrder, page]);

  const handleOpenModal = (driver = null) => {
    setErrorMessage('');
    setCurrentDriver(driver);
    if (driver) {
      // Format date to YYYY-MM-DD for date input
      const formattedDate = driver.licenseExpiryDate 
        ? new Date(driver.licenseExpiryDate).toISOString().split('T')[0] 
        : '';
      
      reset({
        ...driver,
        licenseExpiryDate: formattedDate
      });
    } else {
      reset({
        name: '',
        licenseNumber: '',
        licenseCategory: 'Class C',
        licenseExpiryDate: '',
        phoneNumber: '',
        safetyScore: 100,
        status: 'Available'
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentDriver(null);
  };

  const onSubmit = async (data) => {
    setErrorMessage('');
    setSaving(true);
    try {
      let res;
      if (currentDriver) {
        res = await driverApi.update(currentDriver._id, data);
      } else {
        res = await driverApi.create(data);
      }
      if (res.success) {
        handleCloseModal();
        fetchDrivers();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Error saving driver records.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (driver) => {
    setDriverToDelete(driver);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!driverToDelete) return;
    try {
      const res = await driverApi.delete(driverToDelete._id);
      if (res.success) {
        setDeleteConfirmOpen(false);
        setDriverToDelete(null);
        fetchDrivers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete driver.');
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

  // License Expiry Status check
  const getLicenseStatus = (expiryDateStr) => {
    if (!expiryDateStr) return { badge: 'secondary', text: 'No License' };
    const now = new Date();
    const expiryDate = new Date(expiryDateStr);
    
    if (expiryDate < now) {
      return { badge: 'danger', text: 'Expired' };
    }
    
    // Check if expiring within 30 days
    const diffTime = Math.abs(expiryDate - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) {
      return { badge: 'warning', text: `Expiring in ${diffDays} days` };
    }
    
    return { badge: 'success', text: 'Valid' };
  };

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Drivers Management</h2>
          <p className="text-secondary mb-0">Track driver compliance, license statuses, and safety scores</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => handleOpenModal()} 
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <i className="bi-plus-lg"></i> Add New Driver
          </button>
        )}
      </div>

      {/* Search and Filters Toolbar */}
      <div className="card transitops-card p-3 mb-4">
        <div className="row g-3">
          {/* Search */}
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-light text-muted border-end-0"><i className="bi-search"></i></span>
              <input 
                type="text" 
                className="form-control bg-light border-start-0" 
                placeholder="Search by driver name or license number..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="col-6 col-md-4">
            <select 
              className="form-select bg-light"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="Off Duty">Off Duty</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="col-6 col-md-3">
            <button 
              className="btn btn-outline-secondary w-100"
              onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
            >
              <i className="bi-x-circle me-1"></i> Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Drivers List */}
      <div className="card transitops-card p-4">
        {loading ? (
          <div className="py-5 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Fetching driver directory...</p>
          </div>
        ) : drivers.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table transitops-table text-nowrap w-100">
                <thead>
                  <tr style={{ cursor: 'pointer' }}>
                    <th onClick={() => handleSort('name')}>Name {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    <th onClick={() => handleSort('licenseNumber')}>License Number {sortBy === 'licenseNumber' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    <th>Category</th>
                    <th onClick={() => handleSort('licenseExpiryDate')}>License Expiry {sortBy === 'licenseExpiryDate' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    <th>Phone Number</th>
                    <th onClick={() => handleSort('safetyScore')}>Safety Score {sortBy === 'safetyScore' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    <th onClick={() => handleSort('status')}>Status {sortBy === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                    {canEdit && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d) => {
                    const licStatus = getLicenseStatus(d.licenseExpiryDate);
                    return (
                      <tr key={d._id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="bg-secondary bg-opacity-10 text-secondary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px' }}>
                              {d.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="fw-semibold text-dark">{d.name}</span>
                          </div>
                        </td>
                        <td>{d.licenseNumber}</td>
                        <td>{d.licenseCategory}</td>
                        <td>
                          <div>{new Date(d.licenseExpiryDate).toLocaleDateString()}</div>
                          <span className={`badge bg-${licStatus.badge} text-${licStatus.badge === 'warning' || licStatus.badge === 'info' ? 'dark' : 'white'} fs-9 mt-1`}>
                            {licStatus.text}
                          </span>
                        </td>
                        <td>{d.phoneNumber}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: '6px', maxWidth: '60px' }}>
                              <div 
                                className={`progress-bar bg-${d.safetyScore >= 90 ? 'success' : d.safetyScore >= 80 ? 'warning' : 'danger'}`} 
                                role="progressbar" 
                                style={{ width: `${d.safetyScore}%` }}
                              ></div>
                            </div>
                            <span className="fw-bold">{d.safetyScore}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge-status ${d.status.toLowerCase().replace(/\s+/g, '')}`}>
                            {d.status}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="text-end">
                            <button 
                              onClick={() => handleOpenModal(d)} 
                              className="btn btn-outline-primary btn-sm me-2 rounded-circle"
                              title="Edit Driver"
                            >
                              <i className="bi-pencil"></i>
                            </button>
                            {canDelete && (
                              <button 
                                onClick={() => handleDeleteClick(d)} 
                                className="btn btn-outline-danger btn-sm rounded-circle"
                                title="Delete Driver"
                                disabled={d.status === 'On Trip'}
                              >
                                <i className="bi-trash"></i>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-4 border-top pt-3">
                <span className="small text-muted">
                  Showing {drivers.length} of {pagination.totalResults} results (Page {pagination.currentPage} of {pagination.totalPages})
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
            No drivers match the selected search or filters.
          </div>
        )}
      </div>

      {/* CRUD Edit/Create Modal */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">{currentDriver ? 'Edit Driver Profile' : 'Register New Driver'}</h5>
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
                    {/* Name */}
                    <div className="col-12">
                      <label className="form-label text-secondary small fw-medium">Driver Full Name</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                        placeholder="James Smith"
                        {...register('name', { required: 'Driver name is required' })}
                      />
                      {errors.name && <div className="text-danger small mt-0.5">{errors.name.message}</div>}
                    </div>

                    {/* License Number */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">License Number</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.licenseNumber ? 'is-invalid' : ''}`}
                        placeholder="LIC-XXXXX"
                        {...register('licenseNumber', { required: 'License number is required' })}
                      />
                      {errors.licenseNumber && <div className="text-danger small mt-0.5">{errors.licenseNumber.message}</div>}
                    </div>

                    {/* Category */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">License Category</label>
                      <select className="form-select" {...register('licenseCategory', { required: true })}>
                        <option value="Class C">Class C</option>
                        <option value="Class B">Class B</option>
                        <option value="Class A">Class A</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>

                    {/* Expiry Date */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">License Expiry Date</label>
                      <input 
                        type="date" 
                        className={`form-control ${errors.licenseExpiryDate ? 'is-invalid' : ''}`}
                        {...register('licenseExpiryDate', { required: 'Expiry date is required' })}
                      />
                      {errors.licenseExpiryDate && <div className="text-danger small mt-0.5">{errors.licenseExpiryDate.message}</div>}
                    </div>

                    {/* Phone Number */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Contact Phone Number</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.phoneNumber ? 'is-invalid' : ''}`}
                        placeholder="+1-555-0100"
                        {...register('phoneNumber', { 
                          required: 'Phone number is required',
                          pattern: { value: /^[0-9+-\s]+$/i, message: 'Valid format only' }
                        })}
                      />
                      {errors.phoneNumber && <div className="text-danger small mt-0.5">{errors.phoneNumber.message}</div>}
                    </div>

                    {/* Safety Score */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Safety Score (0-100)</label>
                      <input 
                        type="number" 
                        className={`form-control ${errors.safetyScore ? 'is-invalid' : ''}`}
                        placeholder="100"
                        {...register('safetyScore', { 
                          required: 'Safety score is required',
                          min: { value: 0, message: 'Minimum is 0' },
                          max: { value: 100, message: 'Maximum is 100' }
                        })}
                      />
                      {errors.safetyScore && <div className="text-danger small mt-0.5">{errors.safetyScore.message}</div>}
                    </div>

                    {/* Status */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Status</label>
                      <select 
                        className="form-select" 
                        {...register('status', { required: true })}
                        disabled={currentDriver && currentDriver.status === 'On Trip'} // Lock status if driver is on trip
                      >
                        <option value="Available">Available</option>
                        <option value="On Trip" disabled>On Trip</option>
                        <option value="Off Duty">Off Duty</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                      {currentDriver && currentDriver.status === 'On Trip' && (
                        <div className="text-muted fs-8 mt-1">Driver is currently driving on active trip. Finish the trip to restore.</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Profile'}
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
                <h5 className="fw-bold mb-2">Delete Driver Profile?</h5>
                <p className="text-secondary small mb-4">Are you sure you want to remove driver <strong>{driverToDelete?.name}</strong>? This action cannot be undone.</p>
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

export default Drivers;
