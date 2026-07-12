const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private
exports.getVehicles = async (req, res) => {
  try {
    let query = {};

    // Filtering by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filtering by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Search query matches name, model or registrationNumber
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { model: searchRegex },
        { registrationNumber: searchRegex }
      ];
    }

    // Initialize query chain
    let queryChain = Vehicle.find(query);

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
    const total = await Vehicle.countDocuments(query);

    queryChain = queryChain.skip(startIndex).limit(limit);

    // Execute query
    const vehicles = await queryChain;

    // Pagination info
    const pagination = {
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalResults: total
    };

    res.status(200).json({
      success: true,
      count: vehicles.length,
      pagination,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private
exports.getVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private (Fleet Manager, Dispatcher)
exports.createVehicle = async (req, res) => {
  try {
    const { registrationNumber } = req.body;

    // Registration number uniqueness check
    const existing = await Vehicle.findOne({ registrationNumber: registrationNumber.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Vehicle with registration number ${registrationNumber} already exists` });
    }

    const vehicle = await Vehicle.create(req.body);
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (Fleet Manager, Dispatcher)
exports.updateVehicle = async (req, res) => {
  try {
    let vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Check registration number uniqueness if it's being updated
    if (req.body.registrationNumber && req.body.registrationNumber.toUpperCase() !== vehicle.registrationNumber) {
      const existing = await Vehicle.findOne({ registrationNumber: req.body.registrationNumber.toUpperCase() });
      if (existing) {
        return res.status(400).json({ success: false, message: `Vehicle with registration number ${req.body.registrationNumber} already exists` });
      }
    }

    vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (Fleet Manager)
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Check if vehicle is currently on a dispatched trip
    const activeTrip = await Trip.findOne({ vehicle: req.params.id, status: 'Dispatched' });
    if (activeTrip) {
      return res.status(400).json({ success: false, message: 'Cannot delete vehicle while it is active on a trip' });
    }

    await Vehicle.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
