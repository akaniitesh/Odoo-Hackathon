const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  tripCode: {
    type: String,
    unique: true
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  cargoWeightKg: {
    type: Number,
    required: true,
    min: 0
  },
  plannedDistanceKm: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Draft', 'Dispatched', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  closingOdometerKm: {
    type: Number,
    default: null
  },
  fuelConsumedLiters: {
    type: Number,
    default: null
  },
  revenue: {
    type: Number,
    default: null
  }
}, { timestamps: true });

// Pre-save hook to auto-generate tripCode if not provided
TripSchema.pre('save', async function (next) {
  if (this.isNew && !this.tripCode) {
    try {
      const lastTrip = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
      let nextNum = 1;
      if (lastTrip && lastTrip.tripCode) {
        const match = lastTrip.tripCode.match(/^TR(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      this.tripCode = `TR${String(nextNum).padStart(3, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Trip', TripSchema);
