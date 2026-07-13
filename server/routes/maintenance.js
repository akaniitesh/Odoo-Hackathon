const express = require('express');
const router = express.Router();
const MaintenanceLog = require('../models/MaintenanceLog');
const Vehicle = require('../models/Vehicle');
const Expense = require('../models/Expense');
const { authenticate, authorize } = require('../middleware/auth');

async function upsertMaintenanceExpense(log) {
  await Expense.findOneAndUpdate(
    { maintenanceLogId: log._id },
    {
      vehicleId: log.vehicleId,
      maintenanceLogId: log._id,
      linkedMaintenanceCost: log.cost,
      toll: 0,
      other: 0,
      total: log.cost
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

// GET /api/maintenance
router.get('/', authenticate, authorize(['FleetManager', 'FinancialAnalyst', 'Dispatcher', 'SafetyOfficer']), async (req, res) => {
  try {
    const logs = await MaintenanceLog.find().populate('vehicleId').sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving maintenance records.' });
  }
});

// POST /api/maintenance (FleetManager only)
router.post('/', authenticate, authorize(['FleetManager']), async (req, res) => {
  const { vehicleId, serviceType, cost, date, status, notes } = req.body;

  if (!vehicleId || !serviceType || cost === undefined || !date) {
    return res.status(400).json({ error: 'Vehicle, service type, cost, and date are required.' });
  }

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    if ((status || 'Active') === 'Active' && vehicle.status === 'On Trip') {
      return res.status(409).json({ error: 'A vehicle on an active trip cannot enter maintenance.' });
    }

    const log = new MaintenanceLog({
      vehicleId,
      serviceType,
      cost,
      date: new Date(date),
      status: status || 'Active',
      notes
    });

    await log.save();

    // Enforce Rule 9: Creating an active maintenance record sets the vehicle to In Shop
    if (log.status === 'Active') {
      vehicle.status = 'In Shop';
      await vehicle.save();
    }

    if (log.status === 'Completed') await upsertMaintenanceExpense(log);

    const populatedLog = await MaintenanceLog.findById(log._id).populate('vehicleId');
    res.status(201).json(populatedLog);
  } catch (error) {
    console.error('Create maintenance error:', error);
    res.status(500).json({ error: 'Server error creating maintenance record.' });
  }
});

// PUT /api/maintenance/:id (FleetManager only)
router.put('/:id', authenticate, authorize(['FleetManager']), async (req, res) => {
  const { serviceType, cost, date, status, notes } = req.body;

  try {
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Maintenance record not found.' });
    }

    const oldStatus = log.status;
    
    if (serviceType) log.serviceType = serviceType;
    if (cost !== undefined) log.cost = cost;
    if (date) log.date = new Date(date);
    if (status) log.status = status;
    if (notes !== undefined) log.notes = notes;

    await log.save();

    // Enforce Rule 10: Closing a maintenance record restores the vehicle to Available, unless it is Retired.
    if (oldStatus === 'Active' && log.status === 'Completed') {
      const vehicle = await Vehicle.findById(log.vehicleId);
      if (vehicle && vehicle.status !== 'Retired') {
        vehicle.status = 'Available';
        await vehicle.save();
      }

      await upsertMaintenanceExpense(log);
    }

    // Re-active a completed log? Reverts vehicle back to In Shop
    if (oldStatus === 'Completed' && log.status === 'Active') {
      const vehicle = await Vehicle.findById(log.vehicleId);
      if (vehicle && vehicle.status !== 'Retired') {
        vehicle.status = 'In Shop';
        await vehicle.save();
      }
    }

    const populatedLog = await MaintenanceLog.findById(log._id).populate('vehicleId');
    res.json(populatedLog);
  } catch (error) {
    console.error('Update maintenance error:', error);
    res.status(500).json({ error: 'Server error updating maintenance record.' });
  }
});

module.exports = router;
