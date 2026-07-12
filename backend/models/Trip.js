const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  source: {
    type: String,
    required: [true, 'Please add a source location'],
    trim: true
  },
  destination: {
    type: String,
    required: [true, 'Please add a destination location'],
    trim: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Please associate a vehicle']
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: [true, 'Please associate a driver']
  },
  cargoWeight: {
    type: Number,
    required: [true, 'Please add cargo weight in kg'],
    min: [0, 'Cargo weight cannot be negative']
  },
  plannedDistance: {
    type: Number,
    required: [true, 'Please add planned distance in km'],
    min: [0, 'Planned distance cannot be negative']
  },
  status: {
    type: String,
    required: true,
    enum: ['Draft', 'Dispatched', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  actualDistance: {
    type: Number,
    min: [0, 'Actual distance cannot be negative']
  },
  fuelConsumed: {
    type: Number,
    min: [0, 'Fuel consumed cannot be negative']
  },
  finalOdometer: {
    type: Number,
    min: [0, 'Final odometer cannot be negative']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Trip', TripSchema);
