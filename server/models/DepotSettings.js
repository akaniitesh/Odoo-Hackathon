const mongoose = require('mongoose');

const DepotSettingsSchema = new mongoose.Schema({
  depotName: {
    type: String,
    required: true,
    default: 'Gandhinagar Depot'
  },
  currency: {
    type: String,
    required: true,
    default: '₹'
  },
  distanceUnit: {
    type: String,
    required: true,
    default: 'km'
  }
}, { timestamps: true });

module.exports = mongoose.model('DepotSettings', DepotSettingsSchema);
