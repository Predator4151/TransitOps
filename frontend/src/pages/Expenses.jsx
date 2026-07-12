import React, { useState, useEffect } from 'react';
import { expenses as expenseApi, vehicles as vehicleApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';

const Expenses = () => {
  const { hasRole } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [vehicles, setVehicles] = useState([]);
  
  // Tab control: 'log' or 'operational'
  const [activeTab, setActiveTab] = useState('log');
  const [operationalCosts, setOperationalCosts] = useState([]);
  const [loadingOperational, setLoadingOperational] = useState(false);

  // Search/Filter state
  const [typeFilter, setTypeFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Deletion state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const canEdit = hasRole('Financial Analyst');
  const canDelete = hasRole('Financial Analyst');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await expenseApi.getAll({
        expenseType: typeFilter,
        vehicle: vehicleFilter,
        page,
        limit: 8
      });
      if (res.success) {
        setExpenses(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperationalCosts = async () => {
    setLoadingOperational(true);
    try {
      const res = await expenseApi.getOperationalCosts();
      if (res.success) {
        setOperationalCosts(res.data);
      }
    } catch (err) {
      console.error('Error fetching operational costs:', err);
    } finally {
      setLoadingOperational(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await vehicleApi.getAll({ limit: 100 });
      if (res.success) {
        setVehicles(res.data);
      }
    } catch (err) {
      console.error('Error loading vehicles:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'log') {
      fetchExpenses();
    } else {
      fetchOperationalCosts();
    }
  }, [activeTab, typeFilter, vehicleFilter, page]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenModal = (expense = null) => {
    setErrorMessage('');
    setCurrentExpense(expense);
    fetchVehicles();

    if (expense) {
      const formattedDate = expense.date 
        ? new Date(expense.date).toISOString().split('T')[0] 
        : '';
      reset({
        vehicle: expense.vehicle?._id || '',
        expenseType: expense.expenseType,
        date: formattedDate,
        cost: expense.cost,
        description: expense.description
      });
    } else {
      reset({
        vehicle: '',
        expenseType: 'Miscellaneous',
        date: new Date().toISOString().split('T')[0],
        cost: '',
        description: ''
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentExpense(null);
  };

  const onSubmit = async (data) => {
    setErrorMessage('');
    setSaving(true);
    try {
      let res;
      if (currentExpense) {
        res = await expenseApi.update(currentExpense._id, data);
      } else {
        res = await expenseApi.create(data);
      }
      if (res.success) {
        handleCloseModal();
        if (activeTab === 'log') fetchExpenses();
        else fetchOperationalCosts();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Error saving expense records.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (expense) => {
    setExpenseToDelete(expense);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      const res = await expenseApi.delete(expenseToDelete._id);
      if (res.success) {
        setDeleteConfirmOpen(false);
        setExpenseToDelete(null);
        fetchExpenses();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  const getExpenseBadgeClass = (type) => {
    switch (type) {
      case 'Fuel': return 'bg-primary text-white';
      case 'Maintenance': return 'bg-warning text-dark';
      case 'Toll': return 'bg-info text-dark';
      case 'Repair': return 'bg-danger text-white';
      case 'Insurance': return 'bg-success text-white';
      default: return 'bg-secondary text-white';
    }
  };

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Expenses Ledger</h2>
          <p className="text-secondary mb-0">Record operations costs, filter receipts, and analyze costs per vehicle</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => handleOpenModal()} 
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <i className="bi-plus-lg"></i> Log New Expense
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="card transitops-card p-2 mb-4 bg-light">
        <ul className="nav nav-pills nav-fill">
          <li className="nav-item">
            <button 
              className={`nav-link py-2.5 rounded-3 fw-semibold ${activeTab === 'log' ? 'active bg-primary' : 'text-dark'}`}
              onClick={() => setActiveTab('log')}
            >
              <i className="bi-list-ul me-2"></i> Expense Logbook
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link py-2.5 rounded-3 fw-semibold ${activeTab === 'operational' ? 'active bg-primary' : 'text-dark'}`}
              onClick={() => setActiveTab('operational')}
            >
              <i className="bi-truck-flatbed me-2"></i> Total Operational Costs
            </button>
          </li>
        </ul>
      </div>

      {activeTab === 'log' ? (
        <>
          {/* Filters Toolbar */}
          <div className="card transitops-card p-3 mb-4">
            <div className="row g-3">
              <div className="col-6 col-md-4">
                <select 
                  className="form-select bg-light"
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All Expense Types</option>
                  <option value="Fuel">Fuel</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Toll">Toll</option>
                  <option value="Repair">Repair</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Miscellaneous">Miscellaneous</option>
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
                  onClick={() => { setTypeFilter(''); setVehicleFilter(''); setPage(1); }}
                >
                  <i className="bi-x-circle me-1"></i> Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="card transitops-card p-4">
            {loading ? (
              <div className="py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-2">Loading ledger...</p>
              </div>
            ) : expenses.length > 0 ? (
              <>
                <div className="table-responsive">
                  <table className="table transitops-table text-nowrap w-100">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Vehicle</th>
                        <th>Type</th>
                        <th>Cost</th>
                        <th>Description</th>
                        {canEdit && <th className="text-end">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp) => (
                        <tr key={exp._id}>
                          <td>{new Date(exp.date).toLocaleDateString()}</td>
                          <td>
                            <div className="fw-bold text-dark">{exp.vehicle?.registrationNumber}</div>
                            <span className="text-secondary fs-8">{exp.vehicle?.name}</span>
                          </td>
                          <td>
                            <span className={`badge ${getExpenseBadgeClass(exp.expenseType)} px-2.5 py-1.5 fs-8 rounded-pill`}>
                              {exp.expenseType}
                            </span>
                          </td>
                          <td className="fw-bold text-dark">₹{exp.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td>
                            <div className="text-truncate" style={{ maxWidth: '300px' }} title={exp.description}>
                              {exp.description}
                            </div>
                          </td>
                          {canEdit && (
                            <td className="text-end">
                              {/* Standard manual expenses edit, disable editing of auto fuel/maint expenses for safety */}
                              <button 
                                onClick={() => handleOpenModal(exp)} 
                                className="btn btn-outline-primary btn-sm me-2 rounded-circle"
                                title="Edit Expense"
                              >
                                <i className="bi-pencil"></i>
                              </button>
                              {canDelete && (
                                <button 
                                  onClick={() => handleDeleteClick(exp)} 
                                  className="btn btn-outline-danger btn-sm rounded-circle"
                                  title="Delete Expense"
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
                      Showing {expenses.length} of {pagination.totalResults} results (Page {pagination.currentPage} of {pagination.totalPages})
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
                No expense entries match selected filters.
              </div>
            )}
          </div>
        </>
      ) : (
        /* Operational Cost Per Vehicle tab */
        <div className="card transitops-card p-4">
          {loadingOperational ? (
            <div className="py-5 text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Aggregating cost records...</p>
            </div>
          ) : operationalCosts.length > 0 ? (
            <div className="table-responsive">
              <table className="table transitops-table text-nowrap w-100">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Fuel Cost</th>
                    <th>Maintenance / Repairs</th>
                    <th>Other (Toll/Ins/Misc)</th>
                    <th className="fw-bold">Total Operational Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {operationalCosts.map((item) => {
                    const fuel = item.breakdown?.Fuel || 0;
                    const maintenance = (item.breakdown?.Maintenance || 0) + (item.breakdown?.Repair || 0);
                    const others = (item.breakdown?.Toll || 0) + (item.breakdown?.Insurance || 0) + (item.breakdown?.Miscellaneous || 0);
                    
                    return (
                      <tr key={item.vehicle?._id}>
                        <td>
                          <div className="fw-bold text-dark">{item.vehicle?.registrationNumber}</div>
                          <span className="text-secondary fs-8">{item.vehicle?.name} ({item.vehicle?.model})</span>
                        </td>
                        <td>
                          <span className={`badge-status ${item.vehicle?.status?.toLowerCase().replace(/\s+/g, '')}`}>
                            {item.vehicle?.status}
                          </span>
                        </td>
                        <td>₹{fuel.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td>₹{maintenance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td>₹{others.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="fw-bold fs-7 text-primary">₹{item.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5 text-muted">No operational cost data found.</div>
          )}
        </div>
      )}

      {/* CRUD Modal */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">{currentExpense ? 'Modify Expense Entry' : 'Log Operational Expense'}</h5>
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
                        disabled={!!currentExpense}
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

                    {/* Expense Type */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Expense Type</label>
                      <select className="form-select" {...register('expenseType', { required: true })}>
                        <option value="Miscellaneous">Miscellaneous</option>
                        <option value="Toll">Toll</option>
                        <option value="Repair">Repair</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Fuel">Fuel</option>
                      </select>
                    </div>

                    {/* Date */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Expense Date</label>
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
                        step="0.01"
                        className={`form-control ${errors.cost ? 'is-invalid' : ''}`}
                        placeholder="e.g. 1500"
                        {...register('cost', { 
                          required: 'Cost is required',
                          min: { value: 0.01, message: 'Must be greater than 0' }
                        })}
                      />
                      {errors.cost && <div className="text-danger small mt-0.5">{errors.cost.message}</div>}
                    </div>

                    {/* Description */}
                    <div className="col-12">
                      <label className="form-label text-secondary small fw-medium">Receipt Description</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                        placeholder="e.g. Highway toll ticket, Monthly insurance premium..."
                        {...register('description', { required: 'Description is required' })}
                      />
                      {errors.description && <div className="text-danger small mt-0.5">{errors.description.message}</div>}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Record Expense'}
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
                <h5 className="fw-bold mb-2">Delete Ledger Entry?</h5>
                <p className="text-secondary small mb-4">Are you sure you want to remove this expense entry? This will permanently modify operational cost reports.</p>
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

export default Expenses;
