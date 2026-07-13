const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['FleetManager', 'Dispatcher', 'SafetyOfficer', 'FinancialAnalyst'],
    required: true
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  accountStatus: {
    type: String,
    enum: ['Active', 'PendingApproval', 'Rejected'],
    default: 'Active'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
