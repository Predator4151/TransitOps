import React, { useState, useEffect } from 'react';
import { trips as tripApi, vehicles as vehicleApi, drivers as driverApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';

const Trips = () => {
  const { hasRole } = useAuth();
  const [tripsList, setTripsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Form resources
  const [availVehicles, setAvailVehicles] = useState([]);
  const [availDrivers, setAvailDrivers] = useState([]);

  // Edit / Form states
  const [editingTrip, setEditingTrip] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Complete Trip modal state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [tripToComplete, setTripToComplete] = useState(null);
  const [completeErrorMessage, setCompleteErrorMessage] = useState('');
  const [completing, setCompleting] = useState(false);

  const canEdit = hasRole('Dispatcher');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      source: '',
      destination: '',
      vehicle: '',
      driver: '',
      cargoWeight: '',
      plannedDistance: '',
      status: 'Draft'
    }
  });

  // Watch fields for live validation and stepper highlight
  const watchedVehicleId = watch('vehicle');
  const watchedCargoWeight = watch('cargoWeight');
  const watchedStatus = watch('status') || 'Draft';
  const isFormReadOnly = editingTrip && editingTrip.status !== 'Draft';

  // Stepper helper functions
  const getStepColor = (step) => {
    if (step === 'Draft') return 'green';
    if (step === 'Dispatched') {
      return (watchedStatus === 'Dispatched' || watchedStatus === 'Completed' || watchedStatus === 'Cancelled') ? 'green' : 'grey';
    }
    if (step === 'Completed') {
      if (watchedStatus === 'Cancelled') return 'red';
      return watchedStatus === 'Completed' ? 'green' : 'grey';
    }
    if (step === 'Cancelled') {
      return watchedStatus === 'Cancelled' ? 'red' : 'grey';
    }
    return 'grey';
  };

  const getStepClass = (step) => {
    const color = getStepColor(step);
    if (color === 'green') return 'bg-success text-white shadow-sm';
    if (color === 'red') return 'bg-danger text-white shadow-sm';
    return 'bg-light text-secondary border';
  };

  const getLineStyle = (stepA, stepB) => {
    const colorA = getStepColor(stepA);
    const colorB = getStepColor(stepB);
    const hex = { green: '#198754', grey: '#dee2e6', red: '#dc3545' };
    const codeA = hex[colorA];
    const codeB = hex[colorB];
    if (colorA === colorB) {
      return { backgroundColor: codeA, height: '3px', top: '15px', zIndex: 1 };
    }
    return { 
      background: `linear-gradient(to right, ${codeA} 50%, ${codeB} 50%)`,
      height: '3px', 
      top: '15px', 
      zIndex: 1 
    };
  };

  // Fetch all trips for Live Board
  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await tripApi.getAll({ limit: 100 });
      if (res.success) {
        setTripsList(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching trips for Live Board:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available assets for dropdown selection
  const fetchAvailableAssets = async (tripToEdit = null) => {
    try {
      const vRes = await vehicleApi.getAll({ limit: 100 });
      if (vRes.success) {
        const filtered = vRes.data.filter(v => 
          v.status === 'Available' || 
          (tripToEdit && tripToEdit.vehicle && v._id === tripToEdit.vehicle._id)
        );
        setAvailVehicles(filtered);
      }

      const dRes = await driverApi.getAll({ limit: 100 });
      if (dRes.success) {
        const filtered = dRes.data.filter(d => {
          const isExpired = new Date(d.licenseExpiryDate) < new Date();
          return (d.status === 'Available' && !isExpired && d.status !== 'Suspended') || 
            (tripToEdit && tripToEdit.driver && d._id === tripToEdit.driver._id);
        });
        setAvailDrivers(filtered);
      }
    } catch (err) {
      console.error('Error loading assets:', err);
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchAvailableAssets();
  }, []);

  // Inline Weight Validation
  const selectedVehicleObj = availVehicles.find(v => v._id === watchedVehicleId);
  const maxCapacity = selectedVehicleObj ? selectedVehicleObj.maxLoadCapacity : 0;
  const cargoWeightNum = parseFloat(watchedCargoWeight) || 0;
  const weightExceeded = selectedVehicleObj && cargoWeightNum > maxCapacity;
  const exceededBy = weightExceeded ? cargoWeightNum - maxCapacity : 0;

  // Handle Edit Action from Live Board
  const handleEditClick = async (trip) => {
    setFormError('');
    setFormSuccess('');
    setEditingTrip(trip);
    await fetchAvailableAssets(trip);

    reset({
      source: trip.source,
      destination: trip.destination,
      vehicle: trip.vehicle?._id || '',
      driver: trip.driver?._id || '',
      cargoWeight: trip.cargoWeight,
      plannedDistance: trip.plannedDistance,
      status: trip.status
    });
  };

  // Cancel edit mode / Reset form
  const handleCancelForm = () => {
    setEditingTrip(null);
    setFormError('');
    setFormSuccess('');
    reset({
      source: '',
      destination: '',
      vehicle: '',
      driver: '',
      cargoWeight: '',
      plannedDistance: '',
      status: 'Draft'
    });
  };

  // Form Submit (Save Draft or Dispatch)
  const handleFormSubmit = async (data, selectedStatus) => {
    if (!canEdit) return;
    setFormError('');
    setFormSuccess('');
    
    // Additional capacity validation guard
    if (selectedVehicleObj && parseFloat(data.cargoWeight) > selectedVehicleObj.maxLoadCapacity) {
      setFormError(`Cannot dispatch. Cargo weight exceeds vehicle capacity.`);
      return;
    }

    setSubmitting(true);
    const payload = {
      ...data,
      status: selectedStatus,
      cargoWeight: parseFloat(data.cargoWeight),
      plannedDistance: parseFloat(data.plannedDistance)
    };

    try {
      let res;
      if (editingTrip) {
        res = await tripApi.update(editingTrip._id, payload);
      } else {
        res = await tripApi.create(payload);
      }

      if (res.success) {
        setFormSuccess(`Trip successfully ${selectedStatus === 'Dispatched' ? 'dispatched' : 'saved as draft'}!`);
        setTimeout(() => {
          handleCancelForm();
          fetchTrips();
          fetchAvailableAssets();
        }, 1500);
      } else {
        setFormError(res.message || 'Error occurred while saving trip.');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Server error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // One-Click Dispatch from Live Board
  const handleOneClickDispatch = async (trip) => {
    try {
      const res = await tripApi.update(trip._id, { status: 'Dispatched' });
      if (res.success) {
        fetchTrips();
        fetchAvailableAssets();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch.');
    }
  };

  // Cancel Trip Action
  const handleCancelTrip = async (trip) => {
    if (!window.confirm(`Are you sure you want to cancel the trip from ${trip.source} to ${trip.destination}?`)) return;
    try {
      const res = await tripApi.update(trip._id, { status: 'Cancelled' });
      if (res.success) {
        fetchTrips();
        fetchAvailableAssets();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel trip.');
    }
  };

  // Open Complete Modal dialog
  const handleOpenCompleteModal = (trip) => {
    setCompleteErrorMessage('');
    setTripToComplete(trip);
    setCompleteModalOpen(true);
  };

  // Close Complete Modal dialog
  const handleCloseCompleteModal = () => {
    setCompleteModalOpen(false);
    setTripToComplete(null);
  };

  // Save Complete details
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
        fetchAvailableAssets();
      }
    } catch (err) {
      setCompleteErrorMessage(err.response?.data?.message || 'Failed to complete trip.');
    } finally {
      setCompleting(false);
    }
  };

  // Filter trips based on search bar
  const filteredTrips = tripsList.filter(t => 
    t.source.toLowerCase().includes(search.toLowerCase()) ||
    t.destination.toLowerCase().includes(search.toLowerCase()) ||
    t.vehicle?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.driver?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-fluid px-0">
      {/* Title Header */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Trip Dispatcher</h2>
        <p className="text-secondary mb-0">Dispatches routes, validates load constraints, and monitors active trip logs</p>
      </div>

      <div className="row g-4">
        {/* Left Column: CREATE TRIP Form */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 p-4 h-100">
            {/* Trip Lifecycle Stepper */}
            <div className="mb-4">
              <span className="text-secondary small fw-semibold uppercase-label d-block mb-3">Trip Lifecycle</span>
              <div className="d-flex justify-content-between align-items-center position-relative px-2">
                {/* Connecting Lines */}
                <div className="position-absolute" style={{ ...getLineStyle('Draft', 'Dispatched'), left: '8%', width: '28%' }}></div>
                <div className="position-absolute" style={{ ...getLineStyle('Dispatched', 'Completed'), left: '36%', width: '28%' }}></div>
                <div className="position-absolute" style={{ ...getLineStyle('Completed', 'Cancelled'), left: '64%', width: '28%' }}></div>
                
                {/* Step 1: Draft */}
                <div className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 2 }}>
                  <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold fs-7 transition-all ${
                    getStepClass('Draft')
                  }`} style={{ width: '32px', height: '32px' }}>
                    1
                  </div>
                  <span className="fs-8 mt-2 fw-semibold text-secondary">Draft</span>
                </div>

                {/* Step 2: Dispatched */}
                <div className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 2 }}>
                  <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold fs-7 transition-all ${
                    getStepClass('Dispatched')
                  }`} style={{ width: '32px', height: '32px' }}>
                    2
                  </div>
                  <span className="fs-8 mt-2 fw-semibold text-secondary">Dispatched</span>
                </div>

                {/* Step 3: Completed */}
                <div className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 2 }}>
                  <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold fs-7 transition-all ${
                    getStepClass('Completed')
                  }`} style={{ width: '32px', height: '32px' }}>
                    3
                  </div>
                  <span className="fs-8 mt-2 fw-semibold text-secondary">Completed</span>
                </div>

                {/* Step 4: Cancelled */}
                <div className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 2 }}>
                  <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold fs-7 transition-all ${
                    getStepClass('Cancelled')
                  }`} style={{ width: '32px', height: '32px' }}>
                    4
                  </div>
                  <span className="fs-8 mt-2 fw-semibold text-secondary">Cancelled</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <h5 className="fw-bold mb-3 border-top pt-3">
              {editingTrip 
                ? (isFormReadOnly 
                    ? `View Trip: TR-${editingTrip._id.slice(-4).toUpperCase()}` 
                    : `Edit Trip: TR-${editingTrip._id.slice(-4).toUpperCase()}`) 
                : 'Create Trip'}
            </h5>

            <form onSubmit={handleSubmit((data) => handleFormSubmit(data, watchedStatus))}>
              {formError && (
                <div className="alert alert-danger py-2 small" role="alert">
                  <i className="bi-exclamation-triangle-fill me-2"></i> {formError}
                </div>
              )}

              {formSuccess && (
                <div className="alert alert-success py-2 small" role="alert">
                  <i className="bi-check-circle-fill me-2"></i> {formSuccess}
                </div>
              )}

              {/* Source */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold">Source</label>
                <input 
                  type="text" 
                  className={`form-control ${errors.source ? 'is-invalid' : ''}`}
                  placeholder="e.g. Gandhinagar Depot"
                  disabled={isFormReadOnly || !canEdit || submitting}
                  {...register('source', { required: 'Source location is required' })}
                />
                {errors.source && <div className="invalid-feedback">{errors.source.message}</div>}
              </div>

              {/* Destination */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold">Destination</label>
                <input 
                  type="text" 
                  className={`form-control ${errors.destination ? 'is-invalid' : ''}`}
                  placeholder="e.g. Ahmedabad Hub"
                  disabled={isFormReadOnly || !canEdit || submitting}
                  {...register('destination', { required: 'Destination location is required' })}
                />
                {errors.destination && <div className="invalid-feedback">{errors.destination.message}</div>}
              </div>

              {/* Vehicle Dropdown */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold">Vehicle (Available Only)</label>
                <select 
                  className={`form-select ${errors.vehicle ? 'is-invalid' : ''}`}
                  disabled={isFormReadOnly || !canEdit || submitting}
                  {...register('vehicle', { required: 'Vehicle assignment is required' })}
                >
                  <option value="">Select an available vehicle...</option>
                  {availVehicles.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.name} ({v.registrationNumber}) - {v.maxLoadCapacity} kg capacity
                    </option>
                  ))}
                </select>
                {errors.vehicle && <div className="invalid-feedback">{errors.vehicle.message}</div>}
              </div>

              {/* Driver Dropdown */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold">Driver (Available Only)</label>
                <select 
                  className={`form-select ${errors.driver ? 'is-invalid' : ''}`}
                  disabled={isFormReadOnly || !canEdit || submitting}
                  {...register('driver', { required: 'Driver assignment is required' })}
                >
                  <option value="">Select an available driver...</option>
                  {availDrivers.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name} (Safety Score: {d.safetyScore}/100)
                    </option>
                  ))}
                </select>
                {errors.driver && <div className="invalid-feedback">{errors.driver.message}</div>}
              </div>

              {/* Cargo Weight */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold">Cargo Weight (kg)</label>
                <input 
                  type="number" 
                  className={`form-control ${errors.cargoWeight ? 'is-invalid' : ''}`}
                  placeholder="e.g. 700"
                  disabled={isFormReadOnly || !canEdit || submitting}
                  {...register('cargoWeight', { 
                    required: 'Cargo weight is required',
                    min: { value: 1, message: 'Weight must be greater than 0' }
                  })}
                />
                {errors.cargoWeight && <div className="invalid-feedback">{errors.cargoWeight.message}</div>}
              </div>

              {/* Planned Distance */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold">Planned Distance (km)</label>
                <input 
                  type="number" 
                  className={`form-control ${errors.plannedDistance ? 'is-invalid' : ''}`}
                  placeholder="e.g. 38"
                  disabled={isFormReadOnly || !canEdit || submitting}
                  {...register('plannedDistance', { 
                    required: 'Planned distance is required',
                    min: { value: 1, message: 'Distance must be greater than 0' }
                  })}
                />
                {errors.plannedDistance && <div className="invalid-feedback">{errors.plannedDistance.message}</div>}
              </div>

              {/* Live Exceeded Capacity Warning Panel */}
              {weightExceeded && (
                <div className="alert border-danger p-3 mb-4 rounded-3 text-danger" style={{ backgroundColor: 'rgba(220, 53, 69, 0.05)', border: '1px solid' }}>
                  <div className="small fw-semibold mb-1">Vehicle Capacity: {maxCapacity} kg</div>
                  <div className="small fw-semibold mb-2">Cargo Weight: {cargoWeightNum} kg</div>
                  <div className="small fw-bold d-flex align-items-center gap-1">
                    <i className="bi-x-octagon-fill"></i> Capacity exceeded by {exceededBy} kg — dispatch blocked
                  </div>
                </div>
              )}

              {/* Buttons */}
              {isFormReadOnly ? (
                <div className="d-flex flex-column gap-2 mt-4 w-100">
                  <div className="alert border-secondary text-secondary small py-2 rounded-3 text-center mb-0" style={{ backgroundColor: 'var(--card-bg)', opacity: 0.85, border: '1.5px dashed var(--border-color)' }}>
                    <i className="bi-lock-fill me-1"></i> Viewing {editingTrip.status} trip. Editing is locked.
                  </div>
                  <button 
                    type="button" 
                    onClick={handleCancelForm}
                    className="btn btn-outline-primary w-100"
                  >
                    Create New Trip
                  </button>
                </div>
              ) : (
                canEdit && (
                  <div className="d-flex gap-2.5 mt-4">
                    {/* Dispatch Button */}
                    <button 
                      type="button"
                      onClick={handleSubmit((data) => handleFormSubmit(data, 'Dispatched'))}
                      className={`btn px-4 flex-grow-1 ${weightExceeded ? 'btn-secondary' : 'btn-primary'}`}
                      disabled={weightExceeded || submitting}
                    >
                      {weightExceeded ? 'Dispatch (disabled)' : submitting ? 'Dispatching...' : 'Dispatch'}
                    </button>

                    {/* Save Draft Button */}
                    <button 
                      type="button"
                      onClick={handleSubmit((data) => handleFormSubmit(data, 'Draft'))}
                      className="btn btn-outline-secondary px-3"
                      disabled={weightExceeded || submitting}
                    >
                      Save Draft
                    </button>

                    {/* Cancel / Clear Button */}
                    <button 
                      type="button" 
                      onClick={handleCancelForm}
                      className="btn btn-outline-danger"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  </div>
                )
              )}
            </form>
          </div>
        </div>

        {/* Right Column: LIVE BOARD */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Live Board</h5>
              <div className="d-flex align-items-center gap-2 col-7 col-sm-5 justify-content-end">
                <input 
                  type="text" 
                  className="form-control form-control-sm bg-light border-0" 
                  placeholder="Search liveboard..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {canEdit && (
                  <button 
                    onClick={handleCancelForm}
                    className="btn btn-primary btn-sm d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: '30px', height: '30px', padding: 0 }}
                    title="Revert to blank Create Form"
                  >
                    <i className="bi-plus-lg fs-6"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Live Board Container */}
            <div style={{ maxHeight: '680px', overflowY: 'auto' }} className="d-flex flex-column gap-3 pe-1">
              {loading ? (
                <div className="py-5 text-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-2">Loading Live Board...</p>
                </div>
              ) : filteredTrips.length > 0 ? (
                filteredTrips.map((trip) => {
                  const tripIdLabel = `TR-${trip._id.slice(-4).toUpperCase()}`;
                  const isDraft = trip.status === 'Draft';
                  const isDispatched = trip.status === 'Dispatched';
                  const isCompleted = trip.status === 'Completed';
                  const isCancelled = trip.status === 'Cancelled';
                  
                  let badgeClass = 'bg-secondary text-white';
                  if (isDispatched) badgeClass = 'bg-primary text-white';
                  if (isCompleted) badgeClass = 'bg-success text-white';
                  if (isCancelled) badgeClass = 'bg-danger text-white';

                  return (
                    <div 
                      key={trip._id} 
                      className="p-3 rounded-3" 
                      onClick={() => handleEditClick(trip)}
                      style={{ 
                        border: editingTrip?._id === trip._id ? '1.5px solid var(--primary)' : '1.5px dashed var(--border-color)',
                        backgroundColor: 'var(--card-bg)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        transform: editingTrip?._id === trip._id ? 'translateY(-2px)' : 'translateY(0)',
                        boxShadow: editingTrip?._id === trip._id ? 'var(--card-shadow)' : 'none'
                      }}
                    >
                      {/* Top Row: Trip ID & Vehicle/Driver Info */}
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold text-dark">{tripIdLabel}</span>
                        <span className="small text-secondary fw-semibold">
                          {trip.vehicle ? `${trip.vehicle.name} / ` : 'Unassigned / '}
                          {trip.driver ? trip.driver.name.toUpperCase() : 'UNASSIGNED'}
                        </span>
                      </div>

                      {/* Route Location details */}
                      <div className="mb-3">
                        <span className="fs-7 fw-semibold text-secondary">
                          {trip.source} &rarr; {trip.destination}
                        </span>
                      </div>

                      {/* Status row and actions */}
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top border-light">
                        <span className={`badge ${badgeClass} rounded-pill px-3 py-1.5 fs-8`}>
                          {trip.status}
                        </span>
                        
                        {/* Dynamic labels or actions */}
                        <div className="d-flex gap-2">
                          {isDraft && canEdit && (
                            <>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEditClick(trip); }}
                                className="btn btn-sm btn-outline-secondary"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleOneClickDispatch(trip); }}
                                className="btn btn-sm btn-outline-primary"
                              >
                                Dispatch
                              </button>
                            </>
                          )}

                          {isDispatched && canEdit && (
                            <>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenCompleteModal(trip); }}
                                className="btn btn-sm btn-success text-white"
                              >
                                Complete
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleCancelTrip(trip); }}
                                className="btn btn-sm btn-outline-danger"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {isDispatched && !canEdit && (
                            <span className="small text-muted italic">45 min (est. remaining)</span>
                          )}

                          {isCompleted && (
                            <span className="small text-success fw-semibold">
                              Odometer: {trip.finalOdometer} km (+{trip.actualDistance} km)
                            </span>
                          )}

                          {isCancelled && (
                            <span className="small text-danger italic">Vehicle went to shop</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-5 text-secondary">
                  <i className="bi-geo-alt fs-1 text-muted"></i>
                  <p className="mt-2.5 mb-0">No active trips currently logged on the board.</p>
                </div>
              )}
            </div>

            {/* Footnote instruction */}
            <div className="mt-4 pt-3 border-top text-secondary small italic text-center">
              On Complete: odometer &rarr; fuel log &rarr; expenses &rarr; Vehicle &amp; Driver Available
            </div>
          </div>
        </div>
      </div>

      {/* Complete Trip Details Input Modal */}
      {completeModalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Complete Delivery Cycle</h5>
                <button type="button" className="btn-close" onClick={handleCloseCompleteModal}></button>
              </div>
              <form onSubmit={handleCompleteSubmit}>
                <div className="modal-body">
                  {completeErrorMessage && (
                    <div className="alert alert-danger py-2 small" role="alert">
                      <i className="bi-exclamation-triangle-fill me-2"></i> {completeErrorMessage}
                    </div>
                  )}

                  <p className="text-muted small">
                    Trip from <strong>{tripToComplete?.source}</strong> to <strong>{tripToComplete?.destination}</strong> has arrived. Record vehicle log specs.
                  </p>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-semibold">Current Odometer (km)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        disabled 
                        value={`${tripToComplete?.vehicle?.currentOdometer || 0} km`} 
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-semibold">Final Odometer (km)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="finalOdometer" 
                        required 
                        defaultValue={(tripToComplete?.vehicle?.currentOdometer || 0) + (tripToComplete?.plannedDistance || 0)} 
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-semibold">Actual Distance (km)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      name="actualDistance" 
                      required 
                      defaultValue={tripToComplete?.plannedDistance} 
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-semibold">Fuel Consumed (L)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="fuelConsumed" 
                        placeholder="e.g. 15" 
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-semibold">Fuel Cost ($)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="fuelCost" 
                        placeholder="e.g. 45" 
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={handleCloseCompleteModal}
                    disabled={completing}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-success text-white"
                    disabled={completing}
                  >
                    {completing ? 'Completing...' : 'Close & Release Assets'}
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
