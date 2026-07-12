const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Please associate a vehicle']
  },
  expenseType: {
    type: String,
    required: [true, 'Please specify expense type'],
    enum: ['Fuel', 'Maintenance', 'Toll', 'Repair', 'Insurance', 'Miscellaneous'],
    default: 'Miscellaneous'
  },
  date: {
    type: Date,
    required: [true, 'Please select expense date'],
    default: Date.now
  },
  cost: {
    type: Number,
    required: [true, 'Please enter expense cost'],
    min: [0, 'Cost cannot be negative']
  },
  description: {
    type: String,
    required: [true, 'Please enter a description'],
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', ExpenseSchema);
