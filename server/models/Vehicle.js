const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  nameModel: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  maxLoadCapacityKg: {
    type: Number,
    required: true
  },
  odometerKm: {
    type: Number,
    required: true,
    min: 0
  },
  acquisitionCost: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Available', 'On Trip', 'In Shop', 'Retired'],
    default: 'Available'
  }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);
