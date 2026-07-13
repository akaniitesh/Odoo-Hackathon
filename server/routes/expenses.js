const express = require('express');
const router = express.Router();
const FuelLog = require('../models/FuelLog');
const Expense = require('../models/Expense');
const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/expenses/fuel
router.get('/fuel', authenticate, authorize(['FleetManager', 'FinancialAnalyst', 'Dispatcher']), async (req, res) => {
  try {
    const logs = await FuelLog.find().populate('vehicleId').populate('tripId').sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving fuel logs.' });
  }
});

// POST /api/expenses/fuel (Dispatcher, FinancialAnalyst)
router.post('/fuel', authenticate, authorize(['Dispatcher', 'FinancialAnalyst']), async (req, res) => {
  const { vehicleId, tripId, date, liters, cost } = req.body;

  if (!vehicleId || !date || liters === undefined || cost === undefined) {
    return res.status(400).json({ error: 'Vehicle, date, liters, and cost are required.' });
  }

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    const log = new FuelLog({
      vehicleId,
      tripId: tripId || null,
      date: new Date(date),
      liters,
      cost
    });

    await log.save();
    
    // Also track as a general expense
    const expense = new Expense({
      tripId: tripId || null,
      vehicleId,
      toll: 0,
      other: 0,
      linkedMaintenanceCost: 0,
      total: cost // Fuel cost is the total operational cost in this entry
    });
    await expense.save();

    const populatedLog = await FuelLog.findById(log._id).populate('vehicleId');
    res.status(201).json(populatedLog);
  } catch (error) {
    console.error('Create fuel log error:', error);
    res.status(500).json({ error: 'Server error logging fuel.' });
  }
});

// GET /api/expenses (FleetManager, FinancialAnalyst)
router.get('/', authenticate, authorize(['FleetManager', 'FinancialAnalyst']), async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('vehicleId')
      .populate('tripId')
      .sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving expenses.' });
  }
});

// POST /api/expenses (FinancialAnalyst only)
router.post('/', authenticate, authorize(['FinancialAnalyst']), async (req, res) => {
  const { tripId, vehicleId, toll, other } = req.body;

  if (!vehicleId) {
    return res.status(400).json({ error: 'Vehicle is required.' });
  }

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    const expense = new Expense({
      tripId: tripId || null,
      vehicleId,
      toll: toll || 0,
      other: other || 0,
      linkedMaintenanceCost: 0
    });

    await expense.save();
    const populatedExpense = await Expense.findById(expense._id).populate('vehicleId').populate('tripId');
    res.status(201).json(populatedExpense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Server error logging expense.' });
  }
});

module.exports = router;
