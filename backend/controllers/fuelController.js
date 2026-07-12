const FuelLog = require('../models/FuelLog');
const Vehicle = require('../models/Vehicle');
const Expense = require('../models/Expense');

// @desc    Get all fuel logs
// @route   GET /api/fuel
// @access  Private
exports.getFuelLogs = async (req, res) => {
  try {
    let query = {};

    if (req.query.vehicle) {
      query.vehicle = req.query.vehicle;
    }

    let queryChain = FuelLog.find(query).populate('vehicle');

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
    const total = await FuelLog.countDocuments(query);

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

// @desc    Get single fuel log
// @route   GET /api/fuel/:id
// @access  Private
exports.getFuelLog = async (req, res) => {
  try {
    const log = await FuelLog.findById(req.params.id).populate('vehicle');
    if (!log) {
      return res.status(404).json({ success: false, message: 'Fuel log not found' });
    }
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create fuel log
// @route   POST /api/fuel
// @access  Private (Fleet Manager, Dispatcher)
exports.createFuelLog = async (req, res) => {
  try {
    const { vehicle: vehicleId, fuelCost, fuelQuantity, distanceCovered, date } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const log = await FuelLog.create(req.body);

    // Automatically create a corresponding Fuel Expense
    await Expense.create({
      vehicle: vehicleId,
      expenseType: 'Fuel',
      date: date || new Date(),
      cost: fuelCost,
      description: `Fuel Purchase: ${fuelQuantity}L for ${distanceCovered}km (Fuel Log Ref: ${log._id})`
    });

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update fuel log
// @route   PUT /api/fuel/:id
// @access  Private (Fleet Manager, Dispatcher)
exports.updateFuelLog = async (req, res) => {
  try {
    let log = await FuelLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Fuel log not found' });
    }

    const prevCost = log.fuelCost;

    log = await FuelLog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('vehicle');

    // Update corresponding Expense
    if (req.body.fuelCost !== undefined && req.body.fuelCost !== prevCost) {
      await Expense.findOneAndUpdate(
        { description: new RegExp(log._id.toString()) },
        {
          cost: log.fuelCost,
          description: `Fuel Purchase: ${log.fuelQuantity}L for ${log.distanceCovered}km (Fuel Log Ref: ${log._id})`
        }
      );
    }

    res.status(200).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete fuel log
// @route   DELETE /api/fuel/:id
// @access  Private (Fleet Manager)
exports.deleteFuelLog = async (req, res) => {
  try {
    const log = await FuelLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Fuel log not found' });
    }

    // Delete corresponding Expense
    await Expense.findOneAndDelete({ description: new RegExp(log._id.toString()) });

    await FuelLog.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
