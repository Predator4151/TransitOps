const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Please associate a vehicle']
  },
  maintenanceType: {
    type: String,
    required: [true, 'Please specify maintenance type'],
    enum: ['Routine Oil Change', 'Tire Rotation', 'Brake Repair', 'Engine Tune-up', 'Transmission Service', 'General Maintenance', 'Inspection'],
    default: 'General Maintenance'
  },
  description: {
    type: String,
    required: [true, 'Please provide description of maintenance'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Please select a maintenance date'],
    default: Date.now
  },
  cost: {
    type: Number,
    required: [true, 'Please enter cost of maintenance'],
    min: [0, 'Cost cannot be negative']
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Closed'],
    default: 'Active'
  },
  closingDate: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
