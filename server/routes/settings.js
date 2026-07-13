const express = require('express');
const router = express.Router();
const DepotSettings = require('../models/DepotSettings');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/settings
router.get('/', authenticate, async (req, res) => {
  try {
    let settings = await DepotSettings.findOne();
    if (!settings) {
      settings = new DepotSettings({
        depotName: 'Gandhinagar Depot',
        currency: '₹',
        distanceUnit: 'km'
      });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving settings.' });
  }
});

// POST /api/settings (FleetManager only)
router.post('/', authenticate, authorize(['FleetManager']), async (req, res) => {
  const { depotName, currency, distanceUnit } = req.body;

  if (!depotName || !currency || !distanceUnit) {
    return res.status(400).json({ error: 'Depot name, currency, and distance unit are required.' });
  }

  try {
    let settings = await DepotSettings.findOne();
    if (!settings) {
      settings = new DepotSettings();
    }

    settings.depotName = depotName;
    settings.currency = currency;
    settings.distanceUnit = distanceUnit;

    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating settings.' });
  }
});

module.exports = router;
