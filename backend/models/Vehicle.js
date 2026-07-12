const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  registrationNumber: {
    type: String,
    required: [true, 'Please add a registration number'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Please add a vehicle name'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Please add a model'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Please add a vehicle category'],
    enum: ['LMV', 'MGV', 'HMV', 'LGV', 'PSV'],
    default: 'LMV'
  },
  maxLoadCapacity: {
    type: Number,
    required: [true, 'Please add maximum load capacity in kg'],
    min: [0, 'Load capacity cannot be negative']
  },
  currentOdometer: {
    type: Number,
    required: [true, 'Please add current odometer reading'],
    min: [0, 'Odometer cannot be negative']
  },
  acquisitionCost: {
    type: Number,
    required: [true, 'Please add acquisition cost'],
    min: [0, 'Acquisition cost cannot be negative']
  },
  status: {
    type: String,
    required: true,
    enum: ['Available', 'On Trip', 'In Shop', 'Retired'],
    default: 'Available'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vehicle', VehicleSchema);
