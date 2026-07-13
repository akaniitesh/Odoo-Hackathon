const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  licenseCategory: {
    type: String,
    enum: ['LMV', 'HMV'],
    required: true
  },
  licenseExpiryDate: {
    type: Date,
    required: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true
  },
  safetyScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  tripCompletionRate: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['Available', 'On Trip', 'Off Duty', 'Suspended'],
    default: 'Available'
  }
}, { timestamps: true });

module.exports = mongoose.model('Driver', DriverSchema);
