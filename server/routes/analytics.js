const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const MaintenanceLog = require('../models/MaintenanceLog');
const FuelLog = require('../models/FuelLog');
const Expense = require('../models/Expense');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/analytics
router.get('/', authenticate, authorize(['FleetManager', 'FinancialAnalyst', 'Dispatcher', 'SafetyOfficer']), async (req, res) => {
  try {
    // 1. Core KPIs
    const vehiclesCount = await Vehicle.countDocuments();
    const activeVehicles = await Vehicle.countDocuments({ status: 'On Trip' });
    const availableVehicles = await Vehicle.countDocuments({ status: 'Available' });
    const inShopVehicles = await Vehicle.countDocuments({ status: 'In Shop' });
    const retiredVehicles = await Vehicle.countDocuments({ status: 'Retired' });

    const activeTrips = await Trip.countDocuments({ status: 'Dispatched' });
    const pendingTrips = await Trip.countDocuments({ status: 'Draft' });
    const completedTripsCount = await Trip.countDocuments({ status: 'Completed' });

    const driversOnDuty = await Driver.countDocuments({ status: { $in: ['Available', 'On Trip'] } });

    // Fleet utilization (non-retired active vehicles)
    const totalActiveFleet = vehiclesCount - retiredVehicles;
    const fleetUtilization = totalActiveFleet > 0 ? Math.round((activeVehicles / totalActiveFleet) * 100) : '—';

    // Operational costs
    const fuelLogs = await FuelLog.find();
    const totalFuelCost = fuelLogs.reduce((sum, item) => sum + item.cost, 0);
    const totalFuelLiters = fuelLogs.reduce((sum, item) => sum + item.liters, 0);

    const maintenanceLogs = await MaintenanceLog.find();
    const totalMaintenanceCost = maintenanceLogs.reduce((sum, item) => sum + item.cost, 0);

    const expenses = await Expense.find();
    const totalTolls = expenses.reduce((sum, item) => sum + (item.toll || 0), 0);
    const totalOtherExpenses = expenses.reduce((sum, item) => sum + (item.other || 0), 0);

    const totalOperationalCost = totalFuelCost + totalMaintenanceCost + totalTolls + totalOtherExpenses;

    // Fuel efficiency (km/L)
    const completedTrips = await Trip.find({ status: 'Completed' });
    const totalCompletedDistance = completedTrips.reduce((sum, trip) => sum + (trip.plannedDistanceKm || 0), 0);
    const fuelEfficiency = totalFuelLiters > 0 ? (totalCompletedDistance / totalFuelLiters).toFixed(2) : '—';

    // 2. ROI calculations per vehicle
    // ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
    const vehicles = await Vehicle.find();
    const vehicleAnalyticsList = [];

    for (const vehicle of vehicles) {
      // Find fuel logs for this vehicle
      const vFuelLogs = fuelLogs.filter(f => f.vehicleId.toString() === vehicle._id.toString());
      const vFuelCost = vFuelLogs.reduce((sum, item) => sum + item.cost, 0);

      // Find maintenance logs for this vehicle
      const vMaintLogs = maintenanceLogs.filter(m => m.vehicleId.toString() === vehicle._id.toString());
      const vMaintCost = vMaintLogs.reduce((sum, item) => sum + item.cost, 0);

      // Find trips for this vehicle
      const vTrips = completedTrips.filter(t => t.vehicleId.toString() === vehicle._id.toString());
      const vRevenue = vTrips.reduce((sum, item) => sum + (item.revenue || 0), 0);

      const netEarnings = vRevenue - (vMaintCost + vFuelCost);
      const roiPercent = vehicle.acquisitionCost > 0 ? ((netEarnings / vehicle.acquisitionCost) * 100).toFixed(2) : null;

      vehicleAnalyticsList.push({
        id: vehicle._id,
        registrationNumber: vehicle.registrationNumber,
        nameModel: vehicle.nameModel,
        type: vehicle.type,
        acquisitionCost: vehicle.acquisitionCost,
        fuelCost: vFuelCost,
        maintenanceCost: vMaintCost,
        revenue: vRevenue,
        roi: roiPercent !== null ? parseFloat(roiPercent) : null,
        totalCost: vFuelCost + vMaintCost
      });
    }

    // Top costliest vehicles (sorted by totalCost descending)
    const costliestVehicles = [...vehicleAnalyticsList]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    // 3. Monthly Revenue (group completed trips by month)
    // We can group them by year-month
    const monthlyRevenueMap = {};
    for (const trip of completedTrips) {
      if (trip.createdAt) {
        const date = new Date(trip.createdAt);
        const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyRevenueMap[monthYear] = (monthlyRevenueMap[monthYear] || 0) + (trip.revenue || 0);
      }
    }
    const monthlyRevenue = Object.keys(monthlyRevenueMap).map(key => ({
      month: key,
      revenue: monthlyRevenueMap[key]
    }));

    res.json({
      kpis: {
        activeVehicles,
        availableVehicles,
        inShopVehicles,
        retiredVehicles,
        activeTrips,
        pendingTrips,
        completedTrips: completedTripsCount,
        driversOnDuty,
        fleetUtilization,
        fuelEfficiency,
        totalOperationalCost,
        totalRevenue: completedTrips.reduce((sum, item) => sum + (item.revenue || 0), 0)
      },
      vehicleROI: vehicleAnalyticsList,
      costliestVehicles,
      monthlyRevenue
    });

  } catch (error) {
    console.error('Analytics compute error:', error);
    res.status(500).json({ error: 'Server error computing analytics.' });
  }
});

module.exports = router;
