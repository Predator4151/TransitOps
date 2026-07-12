const mongoose = require('mongoose');

const FuelLogSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Please associate a vehicle']
  },
  date: {
    type: Date,
    required: [true, 'Please enter a logging date'],
    default: Date.now
  },
  fuelQuantity: {
    type: Number,
    required: [true, 'Please specify fuel quantity in liters'],
    min: [0.1, 'Fuel quantity must be greater than 0']
  },
  fuelCost: {
    type: Number,
    required: [true, 'Please enter fuel cost'],
    min: [0, 'Fuel cost cannot be negative']
  },
  distanceCovered: {
    type: Number,
    required: [true, 'Please enter distance covered in km'],
    min: [0, 'Distance covered cannot be negative']
  },
  fuelEfficiency: {
    type: Number
  }
}, {
  timestamps: true
});

// Auto-calculate fuel efficiency before saving
FuelLogSchema.pre('save', function() {
  if (this.distanceCovered && this.fuelQuantity) {
    this.fuelEfficiency = parseFloat((this.distanceCovered / this.fuelQuantity).toFixed(2));
  } else {
    this.fuelEfficiency = 0;
  }
});

module.exports = mongoose.model('FuelLog', FuelLogSchema);
