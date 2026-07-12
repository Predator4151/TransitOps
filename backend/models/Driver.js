const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add driver name'],
    trim: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'Please add license number'],
    unique: true,
    trim: true
  },
  licenseCategory: {
    type: String,
    required: [true, 'Please add license category'],
    enum: ['Class A', 'Class B', 'Class C', 'Commercial'],
    default: 'Class C'
  },
  licenseExpiryDate: {
    type: Date,
    required: [true, 'Please add license expiry date']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please add a contact phone number'],
    trim: true
  },
  safetyScore: {
    type: Number,
    required: [true, 'Please add a safety score'],
    min: [0, 'Safety score cannot be less than 0'],
    max: [100, 'Safety score cannot exceed 100'],
    default: 100
  },
  status: {
    type: String,
    required: true,
    enum: ['Available', 'On Trip', 'Off Duty', 'Suspended'],
    default: 'Available'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Driver', DriverSchema);
