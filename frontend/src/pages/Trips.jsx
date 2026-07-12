import React, { useState, useEffect } from 'react';
import { trips as tripApi, vehicles as vehicleApi, drivers as driverApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';

const Trips = () => {
  const { hasRole } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  
  // Available vehicles and drivers for the dropdown selection
  const [availVehicles, setAvailVehicles] = useState([]);
  const [availDrivers, setAvailDrivers] = useState([]);

  // Search/Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Complete Trip modal state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [tripToComplete, setTripToComplete] = useState(null);
  const [completeErrorMessage, setCompleteErrorMessage] = useState('');
  const [completing, setCompleting] = useState(false);

  const canEdit = hasRole('Dispatcher');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  
  // Watch values for inline capacity validation
  const selectedVehicleId = watch('vehicle');
  const enteredCargoWeight = watch('cargoWeight');

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await tripApi.getAll({
        status: statusFilter,
        page,
        limit: 8
      });
      if (res.success) {
        setTrips(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAssets = async (tripToEdit = null) => {
    try {
      // Get all vehicles
      const vRes = await vehicleApi.getAll({ limit: 100 });
      if (vRes.success) {
        // Filter: Available, or if editing, also include the currently assigned vehicle
        const filtered = vRes.data.filter(v => 
          v.status === 'Available' || 
          (tripToEdit && tripToEdit.vehicle && v._id === tripToEdit.vehicle._id)
        );
        setAvailVehicles(filtered);
      }

      // Get all drivers
      const dRes = await driverApi.getAll({ limit: 100 });
      if (dRes.success) {
        // Filter: Available and License not expired, or if editing, also include the currently assigned driver
        const filtered = dRes.data.filter(d => {
          const isExpired = new Date(d.licenseExpiryDate) < new Date();
          return (d.status === 'Available' && !isExpired && d.status !== 'Suspended') || 
            (tripToEdit && tripToEdit.driver && d._id === tripToEdit.driver._id);
        });
        setAvailDrivers(filtered);
      }
    } catch (err) {
      console.error('Error fetching available assets:', err);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [statusFilter, page]);

  const handleOpenModal = async (trip = null) => {
    setErrorMessage('');
    setCurrentTrip(trip);
    await fetchAvailableAssets(trip);

    if (trip) {
      // Edit mode
      reset({
        source: trip.source,
        destination: trip.destination,
        vehicle: trip.vehicle?._id || '',
        driver: trip.driver?._id || '',
        cargoWeight: trip.cargoWeight,
        plannedDistance: trip.plannedDistance,
        status: trip.status
      });
    } else {
      // Create mode
      reset({
        source: '',
        destination: '',
        vehicle: '',
        driver: '',
        cargoWeight: '',
        plannedDistance: '',
        status: 'Draft'
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentTrip(null);
  };

  const onSubmit = async (data) => {
    setErrorMessage('');
    
    // Cargo weight validation client-side
    const selectedVeh = availVehicles.find(v => v._id === data.vehicle);
    if (selectedVeh && parseFloat(data.cargoWeight) > selectedVeh.maxLoadCapacity) {
      setErrorMessage(`Cargo weight (${data.cargoWeight}kg) exceeds vehicle maximum capacity (${selectedVeh.maxLoadCapacity}kg).`);
      return;
    }

    setSaving(true);
    try {
      let res;
      if (currentTrip) {
        res = await tripApi.update(currentTrip._id, data);
      } else {
        res = await tripApi.create(data);
      }
      if (res.success) {
        handleCloseModal();
        fetchTrips();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Error processing trip details.');
    } finally {
      setSaving(false);
    }
  };

  const handleOneClickDispatch = async (trip) => {
    try {
      const res = await tripApi.update(trip._id, { status: 'Dispatched' });
      if (res.success) {
        fetchTrips();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch trip.');
    }
  };

  const handleOpenCompleteModal = (trip) => {
    setCompleteErrorMessage('');
    setTripToComplete(trip);
    setCompleteModalOpen(true);
  };

  const handleCloseCompleteModal = () => {
    setCompleteModalOpen(false);
    setTripToComplete(null);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setCompleteErrorMessage('');
    setCompleting(true);

    const formData = new FormData(e.target);
    const finalOdometer = parseFloat(formData.get('finalOdometer'));
    const actualDistance = parseFloat(formData.get('actualDistance'));
    const fuelConsumed = parseFloat(formData.get('fuelConsumed')) || 0;
    const fuelCost = parseFloat(formData.get('fuelCost')) || 0;

    const currentVehOdo = tripToComplete?.vehicle?.currentOdometer || 0;
    if (finalOdometer < currentVehOdo) {
      setCompleteErrorMessage(`Final odometer cannot be less than current odometer (${currentVehOdo}km).`);
      setCompleting(false);
      return;
    }

    try {
      const res = await tripApi.update(tripToComplete._id, {
        status: 'Completed',
        finalOdometer,
        actualDistance,
        fuelConsumed,
        fuelCost
      });
      if (res.success) {
        handleCloseCompleteModal();
        fetchTrips();
      }
    } catch (err) {
      setCompleteErrorMessage(err.response?.data?.message || 'Failed to complete trip.');
    } finally {
      setCompleting(false);
    }
  };

  const handleCancelTrip = async (trip) => {
    if (!window.confirm(`Are you sure you want to cancel the trip from ${trip.source} to ${trip.destination}?`)) return;
    try {
      const res = await tripApi.update(trip._id, { status: 'Cancelled' });
      if (res.success) {
        fetchTrips();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel trip.');
    }
  };

  // Get specs of currently selected vehicle in modal
  const getSelectedVehicleSpecs = () => {
    const v = availVehicles.find(item => item._id === selectedVehicleId);
    return v ? `${v.name} (${v.registrationNumber}) - Capacity: ${v.maxLoadCapacity}kg` : '';
  };

  const isOverCapacity = () => {
    const v = availVehicles.find(item => item._id === selectedVehicleId);
    return v && enteredCargoWeight && parseFloat(enteredCargoWeight) > v.maxLoadCapacity;
  };

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Trips Dispatcher</h2>
          <p className="text-secondary mb-0">Plan routes, assign drivers, and monitor delivery workflows</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => handleOpenModal()} 
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <i className="bi-plus-lg"></i> Plan New Trip
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="card transitops-card p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-4">
            <label className="form-label text-secondary small fw-semibold uppercase-label mb-1">Filter by Status</label>
            <div className="d-flex gap-2 flex-wrap">
              <button onClick={() => { setStatusFilter(''); setPage(1); }} className={`btn btn-sm rounded-pill px-3 ${statusFilter === '' ? 'btn-primary' : 'btn-light'}`}>All</button>
              <button onClick={() => { setStatusFilter('Draft'); setPage(1); }} className={`btn btn-sm rounded-pill px-3 ${statusFilter === 'Draft' ? 'btn-secondary' : 'btn-light'}`}>Draft</button>
              <button onClick={() => { setStatusFilter('Dispatched'); setPage(1); }} className={`btn btn-sm rounded-pill px-3 ${statusFilter === 'Dispatched' ? 'btn-info text-dark' : 'btn-light'}`}>Dispatched</button>
              <button onClick={() => { setStatusFilter('Completed'); setPage(1); }} className={`btn btn-sm rounded-pill px-3 ${statusFilter === 'Completed' ? 'btn-success' : 'btn-light'}`}>Completed</button>
              <button onClick={() => { setStatusFilter('Cancelled'); setPage(1); }} className={`btn btn-sm rounded-pill px-3 ${statusFilter === 'Cancelled' ? 'btn-danger' : 'btn-light'}`}>Cancelled</button>
            </div>
          </div>
        </div>
      </div>

      {/* Trips List */}
      <div className="card transitops-card p-4">
        {loading ? (
          <div className="py-5 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Loading trip records...</p>
          </div>
        ) : trips.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table transitops-table text-nowrap w-100">
                <thead>
                  <tr>
                    <th>Route / Date</th>
                    <th>Vehicle</th>
                    <th>Driver</th>
                    <th>Cargo Weight</th>
                    <th>Distance</th>
                    <th>Status</th>
                    {canEdit && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => (
                    <tr key={t._id}>
                      <td>
                        <div className="fw-bold text-dark">{t.source} → {t.destination}</div>
                        <span className="text-secondary fs-8">{new Date(t.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td>{t.vehicle ? `${t.vehicle.name} (${t.vehicle.registrationNumber})` : <span className="text-danger">None</span>}</td>
                      <td>{t.driver ? t.driver.name : <span className="text-danger">None</span>}</td>
                      <td>{t.cargoWeight} kg</td>
                      <td>
                        <div>Planned: {t.plannedDistance} km</div>
                        {t.status === 'Completed' && (
                          <span className="text-success small">Actual: {t.actualDistance} km</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge-status ${t.status.toLowerCase().replace(/\s+/g, '')}`}>
                          {t.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="text-end">
                          {/* One-click Dispatch button for Draft */}
                          {t.status === 'Draft' && (
                            <button 
                              onClick={() => handleOneClickDispatch(t)} 
                              className="btn btn-outline-info btn-sm text-dark me-2"
                              title="Dispatch Cargo"
                            >
                              <i className="bi-play-fill me-1"></i> Dispatch
                            </button>
                          )}
                          
                          {/* Complete button for Dispatched */}
                          {t.status === 'Dispatched' && (
                            <button 
                              onClick={() => handleOpenCompleteModal(t)} 
                              className="btn btn-outline-success btn-sm me-2"
                              title="Complete Trip"
                            >
                              <i className="bi-check2-circle me-1"></i> Complete
                            </button>
                          )}

                          {/* Edit button for Draft trips */}
                          {t.status === 'Draft' && (
                            <button 
                              onClick={() => handleOpenModal(t)} 
                              className="btn btn-outline-primary btn-sm me-2 rounded-circle"
                              title="Edit Details"
                            >
                              <i className="bi-pencil"></i>
                            </button>
                          )}

                          {/* Cancel button for Dispatched trips */}
                          {t.status === 'Dispatched' && (
                            <button 
                              onClick={() => handleCancelTrip(t)} 
                              className="btn btn-outline-danger btn-sm"
                              title="Cancel Delivery"
                            >
                              <i className="bi-x-circle me-1"></i> Cancel
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
                  Showing {trips.length} of {pagination.totalResults} results (Page {pagination.currentPage} of {pagination.totalPages})
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
            No trips matching the selected status filters.
          </div>
        )}
      </div>

      {/* CRUD Plan Trip Modal */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">{currentTrip ? 'Modify Trip Plan' : 'Plan and Dispatch Trip'}</h5>
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
                    {/* Source */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Source Location</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.source ? 'is-invalid' : ''}`}
                        placeholder="e.g. Seattle Depot"
                        {...register('source', { required: 'Source location is required' })}
                      />
                      {errors.source && <div className="text-danger small mt-0.5">{errors.source.message}</div>}
                    </div>

                    {/* Destination */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Destination Location</label>
                      <input 
                        type="text" 
                        className={`form-control ${errors.destination ? 'is-invalid' : ''}`}
                        placeholder="e.g. Portland Hub"
                        {...register('destination', { required: 'Destination location is required' })}
                      />
                      {errors.destination && <div className="text-danger small mt-0.5">{errors.destination.message}</div>}
                    </div>

                    {/* Vehicle */}
                    <div className="col-12">
                      <label className="form-label text-secondary small fw-medium">Assign Vehicle</label>
                      <select 
                        className={`form-select ${errors.vehicle ? 'is-invalid' : ''}`}
                        {...register('vehicle', { required: 'Please assign a vehicle' })}
                      >
                        <option value="">-- Select Available Vehicle --</option>
                        {availVehicles.map(v => (
                          <option key={v._id} value={v._id}>
                            {v.registrationNumber} - {v.name} ({v.type}) [Cap: {v.maxLoadCapacity}kg]
                          </option>
                        ))}
                      </select>
                      {errors.vehicle && <div className="text-danger small mt-0.5">{errors.vehicle.message}</div>}
                      {selectedVehicleId && (
                        <div className="text-secondary small mt-1">{getSelectedVehicleSpecs()}</div>
                      )}
                    </div>

                    {/* Driver */}
                    <div className="col-12">
                      <label className="form-label text-secondary small fw-medium">Assign Driver</label>
                      <select 
                        className={`form-select ${errors.driver ? 'is-invalid' : ''}`}
                        {...register('driver', { required: 'Please assign a driver' })}
                      >
                        <option value="">-- Select Available Driver --</option>
                        {availDrivers.map(d => (
                          <option key={d._id} value={d._id}>
                            {d.name} - Score: {d.safetyScore}/100 ({d.licenseCategory})
                          </option>
                        ))}
                      </select>
                      {errors.driver && <div className="text-danger small mt-0.5">{errors.driver.message}</div>}
                    </div>

                    {/* Cargo Weight */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Cargo Weight (kg)</label>
                      <input 
                        type="number" 
                        className={`form-control ${errors.cargoWeight || isOverCapacity() ? 'is-invalid' : ''}`}
                        placeholder="e.g. 500"
                        {...register('cargoWeight', { 
                          required: 'Cargo weight is required',
                          min: { value: 1, message: 'Must be greater than 0' }
                        })}
                      />
                      {errors.cargoWeight && <div className="text-danger small mt-0.5">{errors.cargoWeight.message}</div>}
                      {isOverCapacity() && (
                        <div className="text-danger small mt-0.5">Cargo weight exceeds assigned vehicle capacity.</div>
                      )}
                    </div>

                    {/* Planned Distance */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Planned Distance (km)</label>
                      <input 
                        type="number" 
                        className={`form-control ${errors.plannedDistance ? 'is-invalid' : ''}`}
                        placeholder="e.g. 150"
                        {...register('plannedDistance', { 
                          required: 'Planned distance is required',
                          min: { value: 1, message: 'Must be greater than 0' }
                        })}
                      />
                      {errors.plannedDistance && <div className="text-danger small mt-0.5">{errors.plannedDistance.message}</div>}
                    </div>

                    {/* Status */}
                    <div className="col-12">
                      <label className="form-label text-secondary small fw-medium">Status</label>
                      <select className="form-select" {...register('status', { required: true })}>
                        <option value="Draft">Draft (Save plan for later)</option>
                        <option value="Dispatched">Dispatched (Deploy immediately)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || isOverCapacity()}>
                    {saving ? 'Processing...' : 'Save and Deploy'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {completeModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">Log Trip Completion</h5>
                <button type="button" className="btn-close" onClick={handleCloseCompleteModal}></button>
              </div>
              <form onSubmit={handleCompleteSubmit}>
                <div className="modal-body py-3">
                  {completeErrorMessage && (
                    <div className="alert alert-danger py-2 small" role="alert">
                      <i className="bi-exclamation-triangle-fill me-1"></i> {completeErrorMessage}
                    </div>
                  )}

                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <div className="row g-2 text-dark small">
                      <div className="col-6"><strong>Vehicle:</strong> {tripToComplete?.vehicle?.name}</div>
                      <div className="col-6"><strong>Current Odo:</strong> {tripToComplete?.vehicle?.currentOdometer} km</div>
                      <div className="col-6"><strong>Planned Dist:</strong> {tripToComplete?.plannedDistance} km</div>
                      <div className="col-6"><strong>Driver:</strong> {tripToComplete?.driver?.name}</div>
                    </div>
                  </div>

                  <div className="row g-3">
                    {/* Final Odometer */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Final Odometer (km)</label>
                      <input 
                        type="number" 
                        name="finalOdometer"
                        required
                        className="form-control"
                        placeholder="e.g. 125000"
                        defaultValue={(tripToComplete?.vehicle?.currentOdometer || 0) + (tripToComplete?.plannedDistance || 0)}
                      />
                    </div>

                    {/* Actual Distance */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Actual Distance (km)</label>
                      <input 
                        type="number" 
                        name="actualDistance"
                        required
                        className="form-control"
                        placeholder="e.g. 150"
                        defaultValue={tripToComplete?.plannedDistance}
                      />
                    </div>

                    {/* Fuel Consumed */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Fuel Consumed (Liters) <span className="text-muted">(Optional)</span></label>
                      <input 
                        type="number" 
                        name="fuelConsumed"
                        step="0.1"
                        className="form-control"
                        placeholder="e.g. 15"
                      />
                    </div>

                    {/* Fuel Cost */}
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-secondary small fw-medium">Total Fuel Cost ($) <span className="text-muted">(Optional)</span></label>
                      <input 
                        type="number" 
                        name="fuelCost"
                        step="0.01"
                        className="form-control"
                        placeholder="e.g. 22.50"
                      />
                    </div>
                  </div>
                  <div className="text-muted fs-8 mt-3">
                    <i className="bi-info-circle me-1"></i> Entering fuel details will automatically create a Fuel Log and record a Fuel Expense.
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={handleCloseCompleteModal}>Cancel</button>
                  <button type="submit" className="btn btn-success" disabled={completing}>
                    {completing ? 'Completing...' : 'Mark as Completed'}
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

export default Trips;
