const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    default: null
  },
  maintenanceLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaintenanceLog',
    default: null,
    unique: true,
    sparse: true
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  toll: {
    type: Number,
    default: 0,
    min: 0
  },
  other: {
    type: Number,
    default: 0,
    min: 0
  },
  linkedMaintenanceCost: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

ExpenseSchema.pre('save', function(next) {
  this.total = this.toll + this.other + this.linkedMaintenanceCost;
  next();
});

module.exports = mongoose.model('Expense', ExpenseSchema);
