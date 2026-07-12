const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');
const Expense = require('../models/Expense');

// @desc    Get all maintenance records
// @route   GET /api/maintenance
// @access  Private
exports.getMaintenanceLogs = async (req, res) => {
  try {
    let query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.vehicle) {
      query.vehicle = req.query.vehicle;
    }

    let queryChain = Maintenance.find(query).populate('vehicle');

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
    const total = await Maintenance.countDocuments(query);

    queryChain = queryChain.skip(startIndex).limit(limit);

    const logs = await queryChain;

    const pagination = {
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalResults: total
    };

    res.status(200).json({
      success: true,
      count: logs.length,
      pagination,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single maintenance log
// @route   GET /api/maintenance/:id
// @access  Private
exports.getMaintenanceLog = async (req, res) => {
  try {
    const log = await Maintenance.findById(req.params.id).populate('vehicle');
    if (!log) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create maintenance log
// @route   POST /api/maintenance
// @access  Private (Fleet Manager, Dispatcher)
exports.createMaintenanceLog = async (req, res) => {
  try {
    const { vehicle: vehicleId, status } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Prevent active maintenance for retired vehicles
    if (vehicle.status === 'Retired') {
      return res.status(400).json({ success: false, message: 'Cannot schedule maintenance for retired vehicle' });
    }

    const log = await Maintenance.create(req.body);

    // Business Rule: When maintenance starts, vehicle automatically becomes In Shop
    if (status !== 'Closed') {
      vehicle.status = 'In Shop';
      await vehicle.save();
    } else {
      // If logged directly as Closed, create Expense immediately
      if (log.cost > 0) {
        await Expense.create({
          vehicle: vehicle._id,
          expenseType: 'Maintenance',
          date: log.date || new Date(),
          cost: log.cost,
          description: `Maintenance: ${log.maintenanceType} - ${log.description}`
        });
      }
    }

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update maintenance log
// @route   PUT /api/maintenance/:id
// @access  Private (Fleet Manager, Dispatcher)
exports.updateMaintenanceLog = async (req, res) => {
  try {
    let log = await Maintenance.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    const vehicle = await Vehicle.findById(log.vehicle);
    const prevStatus = log.status;
    const newStatus = req.body.status || prevStatus;

    // Handle closing of maintenance
    if (newStatus === 'Closed' && prevStatus === 'Active') {
      // Restore vehicle to Available unless retired
      if (vehicle && vehicle.status !== 'Retired') {
        vehicle.status = 'Available';
        await vehicle.save();
      }

      req.body.closingDate = req.body.closingDate || new Date();

      // Create Expense for this closed maintenance
      const cost = req.body.cost !== undefined ? req.body.cost : log.cost;
      if (cost > 0) {
        await Expense.create({
          vehicle: log.vehicle,
          expenseType: 'Maintenance',
          date: req.body.closingDate,
          cost: cost,
          description: `Maintenance: ${log.maintenanceType} - ${req.body.description || log.description}`
        });
      }
    }

    // Handle reopening of maintenance
    if (newStatus === 'Active' && prevStatus === 'Closed') {
      if (vehicle && vehicle.status !== 'Retired') {
        vehicle.status = 'In Shop';
        await vehicle.save();
      }
    }

    log = await Maintenance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('vehicle');

    res.status(200).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete maintenance log
// @route   DELETE /api/maintenance/:id
// @access  Private (Fleet Manager)
exports.deleteMaintenanceLog = async (req, res) => {
  try {
    const log = await Maintenance.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    // Revert vehicle to Available if maintenance was active and in shop
    if (log.status === 'Active') {
      const vehicle = await Vehicle.findById(log.vehicle);
      if (vehicle && vehicle.status === 'In Shop') {
        vehicle.status = 'Available';
        await vehicle.save();
      }
    }

    await Maintenance.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
