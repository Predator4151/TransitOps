const Expense = require('../models/Expense');
const Vehicle = require('../models/Vehicle');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
exports.getExpenses = async (req, res) => {
  try {
    let query = {};

    if (req.query.expenseType) {
      query.expenseType = req.query.expenseType;
    }

    if (req.query.vehicle) {
      query.vehicle = req.query.vehicle;
    }

    let queryChain = Expense.find(query).populate('vehicle');

    // Sorting
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      queryChain = queryChain.sort({ [req.query.sortBy]: sortOrder });
    } else {
      queryChain = queryChain.sort({ date: -1 });
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Expense.countDocuments(query);

    queryChain = queryChain.skip(startIndex).limit(limit);

    const expenses = await queryChain;

    const pagination = {
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalResults: total
    };

    res.status(200).json({
      success: true,
      count: expenses.length,
      pagination,
      data: expenses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
exports.getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('vehicle');
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }
    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create expense
// @route   POST /api/expenses
// @access  Private (Fleet Manager, Financial Analyst)
exports.createExpense = async (req, res) => {
  try {
    const { vehicle: vehicleId } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const expense = await Expense.create(req.body);
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private (Fleet Manager, Financial Analyst)
exports.updateExpense = async (req, res) => {
  try {
    let expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('vehicle');

    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Fleet Manager, Financial Analyst)
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get total operational cost grouped by vehicle
// @route   GET /api/expenses/operational-costs
// @access  Private
exports.getOperationalCosts = async (req, res) => {
  try {
    const costs = await Expense.aggregate([
      {
        $group: {
          _id: '$vehicle',
          totalCost: { $sum: '$cost' },
          breakdown: {
            $push: {
              type: '$expenseType',
              cost: '$cost'
            }
          }
        }
      }
    ]);

    // Populate vehicle details
    const populatedCosts = await Vehicle.populate(costs, { path: '_id', select: 'registrationNumber name model status' });

    res.status(200).json({
      success: true,
      data: populatedCosts.map(item => ({
        vehicle: item._id,
        totalCost: item.totalCost,
        breakdown: item.breakdown.reduce((acc, curr) => {
          acc[curr.type] = (acc[curr.type] || 0) + curr.cost;
          return acc;
        }, {})
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
