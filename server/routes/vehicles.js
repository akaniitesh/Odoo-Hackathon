const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/vehicles
router.get('/', authenticate, authorize(['FleetManager', 'Dispatcher', 'FinancialAnalyst', 'SafetyOfficer']), async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) {
      filters.status = req.query.status;
    }
    if (req.query.type) {
      filters.type = req.query.type;
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filters.$or = [
        { registrationNumber: searchRegex },
        { nameModel: searchRegex }
      ];
    }
    const vehicles = await Vehicle.find(filters);
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving vehicles.' });
  }
});

// POST /api/vehicles (FleetManager only)
router.post('/', authenticate, authorize(['FleetManager']), async (req, res) => {
  const { registrationNumber, nameModel, type, maxLoadCapacityKg, odometerKm, acquisitionCost, status } = req.body;

  if (!registrationNumber || !nameModel || !type || !maxLoadCapacityKg || odometerKm === undefined || acquisitionCost === undefined) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Check uniqueness of registrationNumber (Rule 1)
    const existing = await Vehicle.findOne({ registrationNumber: registrationNumber.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ error: `Registration number '${registrationNumber}' is already registered.` });
    }

    const vehicle = new Vehicle({
      registrationNumber: registrationNumber.toUpperCase().trim(),
      nameModel,
      type,
      maxLoadCapacityKg,
      odometerKm,
      acquisitionCost,
      status: status || 'Available'
    });

    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Server error creating vehicle.' });
  }
});

// PUT /api/vehicles/:id (FleetManager only)
router.put('/:id', authenticate, authorize(['FleetManager']), async (req, res) => {
  const { nameModel, type, maxLoadCapacityKg, odometerKm, acquisitionCost, status } = req.body;

  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(444).json({ error: 'Vehicle not found.' });
    }

    if (nameModel) vehicle.nameModel = nameModel;
    if (type) vehicle.type = type;
    if (maxLoadCapacityKg) vehicle.maxLoadCapacityKg = maxLoadCapacityKg;
    if (odometerKm !== undefined) vehicle.odometerKm = odometerKm;
    if (acquisitionCost !== undefined) vehicle.acquisitionCost = acquisitionCost;
    if (status) vehicle.status = status;

    await vehicle.save();
    res.json(vehicle);
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Server error updating vehicle.' });
  }
});

// DELETE /api/vehicles/:id (FleetManager only)
router.delete('/:id', authenticate, authorize(['FleetManager']), async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting vehicle.' });
  }
});

module.exports = router;
