const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/drivers
router.get('/', authenticate, authorize(['FleetManager', 'Dispatcher', 'SafetyOfficer']), async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) {
      filters.status = req.query.status;
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filters.$or = [
        { name: searchRegex },
        { licenseNumber: searchRegex }
      ];
    }
    const drivers = await Driver.find(filters);
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving drivers.' });
  }
});

// POST /api/drivers (SafetyOfficer only)
router.post('/', authenticate, authorize(['SafetyOfficer']), async (req, res) => {
  const { name, licenseNumber, licenseCategory, licenseExpiryDate, contactNumber, safetyScore, tripCompletionRate, status } = req.body;

  if (!name || !licenseNumber || !licenseCategory || !licenseExpiryDate || !contactNumber) {
    return res.status(400).json({ error: 'Required fields are missing.' });
  }

  try {
    // Check DL uniqueness
    const existing = await Driver.findOne({ licenseNumber: licenseNumber.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ error: `Driver with license number '${licenseNumber}' already exists.` });
    }

    const driver = new Driver({
      name,
      licenseNumber: licenseNumber.toUpperCase().trim(),
      licenseCategory,
      licenseExpiryDate: new Date(licenseExpiryDate),
      contactNumber,
      safetyScore: safetyScore !== undefined ? safetyScore : 100,
      tripCompletionRate: tripCompletionRate !== undefined ? tripCompletionRate : 100,
      status: status || 'Available'
    });

    await driver.save();
    res.status(201).json(driver);
  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({ error: 'Server error creating driver.' });
  }
});

// PUT /api/drivers/:id (SafetyOfficer only)
router.put('/:id', authenticate, authorize(['SafetyOfficer']), async (req, res) => {
  const { name, licenseNumber, licenseCategory, licenseExpiryDate, contactNumber, safetyScore, tripCompletionRate, status } = req.body;

  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found.' });
    }

    if (name) driver.name = name;
    if (licenseNumber) {
      const existing = await Driver.findOne({ 
        licenseNumber: licenseNumber.toUpperCase().trim(), 
        _id: { $ne: driver._id } 
      });
      if (existing) {
        return res.status(400).json({ error: 'License number already registered to another driver.' });
      }
      driver.licenseNumber = licenseNumber.toUpperCase().trim();
    }
    if (licenseCategory) driver.licenseCategory = licenseCategory;
    if (licenseExpiryDate) driver.licenseExpiryDate = new Date(licenseExpiryDate);
    if (contactNumber) driver.contactNumber = contactNumber;
    if (safetyScore !== undefined) driver.safetyScore = safetyScore;
    if (tripCompletionRate !== undefined) driver.tripCompletionRate = tripCompletionRate;
    if (status) driver.status = status;

    await driver.save();
    res.json(driver);
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ error: 'Server error updating driver.' });
  }
});

// DELETE /api/drivers/:id (SafetyOfficer only)
router.delete('/:id', authenticate, authorize(['SafetyOfficer']), async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found.' });
    }
    res.json({ message: 'Driver deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting driver.' });
  }
});

module.exports = router;
