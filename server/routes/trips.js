const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const FuelLog = require('../models/FuelLog');
const Expense = require('../models/Expense');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/trips
router.get('/', authenticate, authorize(['FleetManager', 'Dispatcher', 'SafetyOfficer', 'FinancialAnalyst']), async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('vehicleId')
      .populate('driverId')
      .sort({ createdAt: -1 });
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving trips.' });
  }
});

// POST /api/trips (Dispatcher only)
router.post('/', authenticate, authorize(['Dispatcher']), async (req, res) => {
  const { source, destination, vehicleId, driverId, cargoWeightKg, plannedDistanceKm } = req.body;

  if (!source || !destination || !vehicleId || !driverId || !cargoWeightKg || !plannedDistanceKm) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    const driver = await Driver.findById(driverId);

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
    if (!driver) return res.status(404).json({ error: 'Driver not found.' });

    // Enforce Rule 5: Cargo weight cannot exceed vehicle capacity
    if (cargoWeightKg > vehicle.maxLoadCapacityKg) {
      return res.status(400).json({ 
        error: `Cargo weight (${cargoWeightKg} kg) exceeds vehicle maximum capacity (${vehicle.maxLoadCapacityKg} kg).` 
      });
    }

    const trip = new Trip({
      source,
      destination,
      vehicleId,
      driverId,
      cargoWeightKg,
      plannedDistanceKm,
      status: 'Draft'
    });

    await trip.save();
    
    // Populate and return
    const populatedTrip = await Trip.findById(trip._id).populate('vehicleId').populate('driverId');
    res.status(201).json(populatedTrip);
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: 'Server error creating trip.' });
  }
});

// POST /api/trips/:id/dispatch (Dispatcher only)
router.post('/:id/dispatch', authenticate, authorize(['Dispatcher']), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    if (trip.status !== 'Draft') {
      return res.status(400).json({ error: `Only Draft trips can be dispatched. Current status: ${trip.status}` });
    }

    const vehicle = await Vehicle.findById(trip.vehicleId);
    const driver = await Driver.findById(trip.driverId);

    if (!vehicle) return res.status(404).json({ error: 'Assigned vehicle not found.' });
    if (!driver) return res.status(404).json({ error: 'Assigned driver not found.' });

    // Enforce Rule 2: Retired or In Shop vehicles cannot be dispatched
    if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
      return res.status(400).json({ 
        error: `Vehicle ${vehicle.nameModel} is currently ${vehicle.status} and cannot be dispatched.` 
      });
    }

    // Enforce Rule 4: Vehicle already On Trip cannot be assigned
    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ error: `Vehicle ${vehicle.nameModel} is already on another trip.` });
    }

    // Enforce Rule 3: Driver with expired license or Suspended status cannot be assigned
    if (driver.status === 'Suspended') {
      return res.status(400).json({ error: `Driver ${driver.name} is currently Suspended.` });
    }
    
    const isExpired = new Date(driver.licenseExpiryDate) < new Date();
    if (isExpired) {
      return res.status(400).json({ error: `Driver ${driver.name}'s license has expired.` });
    }

    // Enforce Rule 4: Driver already On Trip cannot be assigned
    if (driver.status === 'On Trip') {
      return res.status(400).json({ error: `Driver ${driver.name} is already on another trip.` });
    }

    // Enforce Rule 5 (Double check at dispatch time)
    if (trip.cargoWeightKg > vehicle.maxLoadCapacityKg) {
      return res.status(400).json({ 
        error: `Cargo weight (${trip.cargoWeightKg} kg) exceeds vehicle capacity (${vehicle.maxLoadCapacityKg} kg).` 
      });
    }

    // Update statuses
    vehicle.status = 'On Trip';
    driver.status = 'On Trip';
    trip.status = 'Dispatched';

    await vehicle.save();
    await driver.save();
    await trip.save();

    const populatedTrip = await Trip.findById(trip._id).populate('vehicleId').populate('driverId');
    res.json({ message: 'Trip dispatched successfully.', trip: populatedTrip });
  } catch (error) {
    console.error('Dispatch trip error:', error);
    res.status(500).json({ error: 'Server error dispatching trip.' });
  }
});

// POST /api/trips/:id/complete (Dispatcher only)
router.post('/:id/complete', authenticate, authorize(['Dispatcher']), async (req, res) => {
  const { closingOdometerKm, fuelConsumedLiters, revenue, toll, other } = req.body;

  if (closingOdometerKm === undefined || fuelConsumedLiters === undefined || revenue === undefined) {
    return res.status(400).json({ error: 'Closing odometer, fuel consumed, and revenue are required.' });
  }

  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    if (trip.status !== 'Dispatched') {
      return res.status(400).json({ error: `Only Dispatched trips can be completed. Current status: ${trip.status}` });
    }

    const vehicle = await Vehicle.findById(trip.vehicleId);
    const driver = await Driver.findById(trip.driverId);

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
    if (!driver) return res.status(404).json({ error: 'Driver not found.' });

    // Validate odometer progression
    if (closingOdometerKm < vehicle.odometerKm) {
      return res.status(400).json({ 
        error: `Closing odometer (${closingOdometerKm} km) cannot be less than current odometer (${vehicle.odometerKm} km).` 
      });
    }

    // Save final details on trip
    trip.closingOdometerKm = closingOdometerKm;
    trip.fuelConsumedLiters = fuelConsumedLiters;
    trip.revenue = revenue;
    trip.status = 'Completed';
    await trip.save();

    // Update vehicle odometer and status to Available (Rule 7)
    vehicle.odometerKm = closingOdometerKm;
    vehicle.status = 'Available';
    await vehicle.save();

    // Update driver status to Available (Rule 7)
    driver.status = 'Available';
    
    // Incremental safety score / completion rate calculations can happen here
    // Let's increment safety score by a tiny bit (max 100) or keep completion rate high
    driver.tripCompletionRate = Math.min(100, Math.round((driver.tripCompletionRate * 9 + 100) / 10));
    await driver.save();

    // Log Fuel Log record
    // Fuel price average ₹95/L for calculation or actual logged cost
    const fuelCost = fuelConsumedLiters * 95; // default ₹95 per liter
    const fuelLog = new FuelLog({
      vehicleId: vehicle._id,
      tripId: trip._id,
      date: new Date(),
      liters: fuelConsumedLiters,
      cost: fuelCost
    });
    await fuelLog.save();

    // Log Expense record
    // Check if there are maintenance records linked
    const expense = new Expense({
      tripId: trip._id,
      vehicleId: vehicle._id,
      toll: toll || 0,
      other: other || 0,
      linkedMaintenanceCost: 0 // Completed maintenance logs are logged separately, but can be updated later
    });
    await expense.save();

    const populatedTrip = await Trip.findById(trip._id).populate('vehicleId').populate('driverId');
    res.json({ message: 'Trip completed successfully.', trip: populatedTrip });
  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({ error: 'Server error completing trip.' });
  }
});

// POST /api/trips/:id/cancel (Dispatcher only)
router.post('/:id/cancel', authenticate, authorize(['Dispatcher']), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    const vehicle = await Vehicle.findById(trip.vehicleId);
    const driver = await Driver.findById(trip.driverId);

    // If cancelled when Dispatched, restore vehicle and driver to Available (Rule 8)
    if (trip.status === 'Dispatched') {
      if (vehicle) {
        vehicle.status = 'Available';
        await vehicle.save();
      }
      if (driver) {
        driver.status = 'Available';
        // Reduce completion rate due to cancellation
        driver.tripCompletionRate = Math.max(0, Math.round((driver.tripCompletionRate * 9) / 10));
        await driver.save();
      }
    }

    trip.status = 'Cancelled';
    await trip.save();

    const populatedTrip = await Trip.findById(trip._id).populate('vehicleId').populate('driverId');
    res.json({ message: 'Trip cancelled successfully.', trip: populatedTrip });
  } catch (error) {
    console.error('Cancel trip error:', error);
    res.status(500).json({ error: 'Server error cancelling trip.' });
  }
});

module.exports = router;
