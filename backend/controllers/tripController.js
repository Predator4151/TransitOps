const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const FuelLog = require('../models/FuelLog');
const Expense = require('../models/Expense');

// @desc    Get all trips
// @route   GET /api/trips
// @access  Private
exports.getTrips = async (req, res) => {
  try {
    let query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.vehicle) {
      query.vehicle = req.query.vehicle;
    }

    if (req.query.driver) {
      query.driver = req.query.driver;
    }

    let queryChain = Trip.find(query)
      .populate('vehicle')
      .populate('driver');

    // Sorting
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      queryChain = queryChain.sort({ [req.query.sortBy]: sortOrder });
    } else {
      queryChain = queryChain.sort({ createdAt: -1 });
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Trip.countDocuments(query);

    queryChain = queryChain.skip(startIndex).limit(limit);

    const trips = await queryChain;

    const pagination = {
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalResults: total
    };

    res.status(200).json({
      success: true,
      count: trips.length,
      pagination,
      data: trips
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single trip
// @route   GET /api/trips/:id
// @access  Private
exports.getTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('vehicle')
      .populate('driver');
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    res.status(200).json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new trip
// @route   POST /api/trips
// @access  Private (Dispatcher, Fleet Manager)
exports.createTrip = async (req, res) => {
  try {
    const { vehicle: vehicleId, driver: driverId, cargoWeight, status } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Validations if dispatching immediately
    if (status === 'Dispatched') {
      // 1. Retired or In Shop vehicles must never be dispatched
      if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
        return res.status(400).json({ success: false, message: `Vehicle status is '${vehicle.status}'. Retired or In Shop vehicles cannot be dispatched.` });
      }

      // 2. Vehicle already on trip cannot be assigned
      if (vehicle.status === 'On Trip') {
        return res.status(400).json({ success: false, message: 'Vehicle is already on another active trip' });
      }

      // 3. Driver with expired license cannot be assigned
      const now = new Date();
      if (new Date(driver.licenseExpiryDate) < now) {
        return res.status(400).json({ success: false, message: 'Driver license has expired' });
      }

      // 4. Suspended driver cannot be assigned
      if (driver.status === 'Suspended' || driver.status === 'Off Duty') {
        return res.status(400).json({ success: false, message: `Driver status is '${driver.status}'. Cannot dispatch trip.` });
      }

      // 5. Driver already on trip cannot be assigned
      if (driver.status === 'On Trip') {
        return res.status(400).json({ success: false, message: 'Driver is already on another active trip' });
      }

      // 6. Cargo weight must not exceed vehicle capacity
      if (cargoWeight > vehicle.maxLoadCapacity) {
        return res.status(400).json({ success: false, message: `Cargo weight (${cargoWeight}kg) exceeds vehicle maximum capacity (${vehicle.maxLoadCapacity}kg)` });
      }
    }

    const trip = await Trip.create(req.body);

    // If dispatched, update vehicle and driver status
    if (status === 'Dispatched') {
      vehicle.status = 'On Trip';
      await vehicle.save();

      driver.status = 'On Trip';
      await driver.save();
    }

    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update trip
// @route   PUT /api/trips/:id
// @access  Private (Dispatcher, Fleet Manager)
exports.updateTrip = async (req, res) => {
  try {
    let trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const previousStatus = trip.status;
    const nextStatus = req.body.status || previousStatus;

    const vehicleId = req.body.vehicle || trip.vehicle;
    const driverId = req.body.driver || trip.driver;
    const cargoWeight = req.body.cargoWeight || trip.cargoWeight;

    const vehicle = await Vehicle.findById(vehicleId);
    const driver = await Driver.findById(driverId);

    // Business validations when status changes to Dispatched
    if (nextStatus === 'Dispatched' && previousStatus !== 'Dispatched') {
      if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
        return res.status(400).json({ success: false, message: `Vehicle status is '${vehicle.status}'. Retired or In Shop vehicles cannot be dispatched.` });
      }
      if (vehicle.status === 'On Trip') {
        return res.status(400).json({ success: false, message: 'Vehicle is already on another active trip' });
      }

      const now = new Date();
      if (new Date(driver.licenseExpiryDate) < now) {
        return res.status(400).json({ success: false, message: 'Driver license has expired' });
      }
      if (driver.status === 'Suspended' || driver.status === 'Off Duty') {
        return res.status(400).json({ success: false, message: `Driver status is '${driver.status}'. Cannot dispatch trip.` });
      }
      if (driver.status === 'On Trip') {
        return res.status(400).json({ success: false, message: 'Driver is already on another active trip' });
      }

      if (cargoWeight > vehicle.maxLoadCapacity) {
        return res.status(400).json({ success: false, message: `Cargo weight (${cargoWeight}kg) exceeds vehicle maximum capacity (${vehicle.maxLoadCapacity}kg)` });
      }
    }

    // Handle updates when status transitions to Dispatched
    if (nextStatus === 'Dispatched' && previousStatus !== 'Dispatched') {
      vehicle.status = 'On Trip';
      await vehicle.save();

      driver.status = 'On Trip';
      await driver.save();
    }

    // Handle updates when status transitions to Completed
    if (nextStatus === 'Completed' && previousStatus === 'Dispatched') {
      const finalOdometer = req.body.finalOdometer;
      const actualDistance = req.body.actualDistance || trip.plannedDistance;
      const fuelConsumed = req.body.fuelConsumed || 0;
      const fuelCost = req.body.fuelCost || 0;

      if (!finalOdometer) {
        return res.status(400).json({ success: false, message: 'Please provide the final odometer reading to complete the trip' });
      }

      if (finalOdometer < vehicle.currentOdometer) {
        return res.status(400).json({ success: false, message: `Final odometer (${finalOdometer}km) cannot be less than current odometer (${vehicle.currentOdometer}km)` });
      }

      // Update vehicle status & odometer
      vehicle.status = 'Available';
      vehicle.currentOdometer = finalOdometer;
      await vehicle.save();

      // Update driver status
      driver.status = 'Available';
      await driver.save();

      // If fuel consumed was logged, automatically create a fuel log and expense
      if (fuelConsumed > 0) {
        // Create Fuel Log
        await FuelLog.create({
          vehicle: vehicle._id,
          date: new Date(),
          fuelQuantity: fuelConsumed,
          fuelCost: fuelCost,
          distanceCovered: actualDistance
        });

        // Create Fuel Expense
        await Expense.create({
          vehicle: vehicle._id,
          expenseType: 'Fuel',
          date: new Date(),
          cost: fuelCost,
          description: `Fuel for Trip: ${trip.source} to ${trip.destination}`
        });
      }
    }

    // Handle updates when status transitions to Cancelled
    if (nextStatus === 'Cancelled' && previousStatus === 'Dispatched') {
      vehicle.status = 'Available';
      await vehicle.save();

      driver.status = 'Available';
      await driver.save();
    }

    // Save trip details
    trip = await Trip.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('vehicle').populate('driver');

    res.status(200).json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete trip
// @route   DELETE /api/trips/:id
// @access  Private (Fleet Manager)
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // If trip was Dispatched, restore vehicle and driver status
    if (trip.status === 'Dispatched') {
      await Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'Available' });
      await Driver.findByIdAndUpdate(trip.driver, { status: 'Available' });
    }

    await Trip.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
