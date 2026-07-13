require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB, closeDB } = require('../db');

// Models
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const MaintenanceLog = require('../models/MaintenanceLog');
const FuelLog = require('../models/FuelLog');
const Expense = require('../models/Expense');
const DepotSettings = require('../models/DepotSettings');

async function seedData() {
  try {
    console.log('Connecting to database for seeding...');
    await connectDB();

    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Vehicle.deleteMany({}),
      Driver.deleteMany({}),
      Trip.deleteMany({}),
      MaintenanceLog.deleteMany({}),
      FuelLog.deleteMany({}),
      Expense.deleteMany({}),
      DepotSettings.deleteMany({})
    ]);

    console.log('Seeding initial data...');

    // 1. Seed Depot Settings
    const settings = new DepotSettings({
      depotName: 'Gandhinagar Depot',
      currency: '₹',
      distanceUnit: 'km'
    });
    await settings.save();

    // 2. Seed Users
    const passwordHash = await bcrypt.hash('admin123', 10);
    const users = [
      { name: 'Fleet Manager', email: 'manager@transitops.com', passwordHash, role: 'FleetManager', accountStatus: 'Active' },
      { name: 'Dispatcher', email: 'dispatcher@transitops.com', passwordHash, role: 'Dispatcher', accountStatus: 'Active' },
      { name: 'Safety Officer', email: 'safety@transitops.com', passwordHash, role: 'SafetyOfficer', accountStatus: 'Active' },
      { name: 'Financial Analyst', email: 'finance@transitops.com', passwordHash, role: 'FinancialAnalyst', accountStatus: 'Active' }
    ];
    const createdUsers = await User.insertMany(users);
    console.log(`Seeded ${createdUsers.length} users.`);

    // 3. Seed Vehicles
    const vehiclesData = [
      { registrationNumber: 'GJ01AB4521', nameModel: 'VAN-05', type: 'Van', maxLoadCapacityKg: 500, odometerKm: 74000, acquisitionCost: 620000, status: 'Available' },
      { registrationNumber: 'GJ01AB9981', nameModel: 'TRUCK-11', type: 'Truck', maxLoadCapacityKg: 5000, odometerKm: 182000, acquisitionCost: 2450000, status: 'On Trip' },
      { registrationNumber: 'GJ01AB1120', nameModel: 'MINI-03', type: 'Mini', maxLoadCapacityKg: 1000, odometerKm: 66000, acquisitionCost: 410000, status: 'In Shop' },
      { registrationNumber: 'GJ01AB0087', nameModel: 'VAN-09', type: 'Van', maxLoadCapacityKg: 750, odometerKm: 249400, acquisitionCost: 540000, status: 'Retired' },
      { registrationNumber: 'GJ01AB2244', nameModel: 'TRUCK-04', type: 'Truck', maxLoadCapacityKg: 5000, odometerKm: 95000, acquisitionCost: 2200000, status: 'Available' },
      { registrationNumber: 'GJ01AB5588', nameModel: 'MINI-08', type: 'Mini', maxLoadCapacityKg: 1000, odometerKm: 105000, acquisitionCost: 430000, status: 'On Trip' }
    ];
    const createdVehicles = await Vehicle.insertMany(vehiclesData);
    console.log(`Seeded ${createdVehicles.length} vehicles.`);

    // Map by nameModel for easy referencing
    const vMap = {};
    createdVehicles.forEach(v => { vMap[v.nameModel] = v; });

    // 4. Seed Drivers
    const driversData = [
      { name: 'Alex', licenseNumber: 'DL-88213', licenseCategory: 'LMV', licenseExpiryDate: new Date('2028-12-31'), contactNumber: '+919876543210', safetyScore: 95, tripCompletionRate: 98, status: 'Available' },
      { name: 'John', licenseNumber: 'DL-44120', licenseCategory: 'HMV', licenseExpiryDate: new Date('2025-03-15'), contactNumber: '+919876543211', safetyScore: 82, tripCompletionRate: 90, status: 'Suspended' },
      { name: 'Priya', licenseNumber: 'DL-77031', licenseCategory: 'LMV', licenseExpiryDate: new Date('2027-08-20'), contactNumber: '+919876543212', safetyScore: 97, tripCompletionRate: 100, status: 'On Trip' },
      { name: 'Suresh', licenseNumber: 'DL-90045', licenseCategory: 'HMV', licenseExpiryDate: new Date('2027-01-10'), contactNumber: '+919876543213', safetyScore: 88, tripCompletionRate: 92, status: 'Off Duty' }
    ];
    const createdDrivers = await Driver.insertMany(driversData);
    console.log(`Seeded ${createdDrivers.length} drivers.`);

    // Map by name for easy referencing
    const dMap = {};
    createdDrivers.forEach(d => { dMap[d.name] = d; });

    // 5. Seed Trips
    const trip1 = new Trip({
      tripCode: 'TR001',
      source: 'Gandhinagar Depot',
      destination: 'Ahmedabad Hub',
      vehicleId: vMap['VAN-05']._id,
      driverId: dMap['Alex']._id,
      cargoWeightKg: 450,
      plannedDistanceKm: 32,
      status: 'Dispatched'
    });
    // Set VAN-05 & Alex status to On Trip to be consistent
    vMap['VAN-05'].status = 'On Trip';
    await vMap['VAN-05'].save();
    dMap['Alex'].status = 'On Trip';
    await dMap['Alex'].save();

    const trip2 = new Trip({
      tripCode: 'TR002',
      source: 'Surat Terminal',
      destination: 'Vadodara Crossing',
      vehicleId: vMap['TRUCK-11']._id,
      driverId: dMap['John']._id,
      cargoWeightKg: 4500,
      plannedDistanceKm: 150,
      status: 'Completed',
      closingOdometerKm: 182000,
      fuelConsumedLiters: 110,
      revenue: 12000
    });

    const trip3 = new Trip({
      tripCode: 'TR003',
      source: 'Kalol GIDC',
      destination: 'Mehsana Industrial Park',
      vehicleId: vMap['MINI-08']._id,
      driverId: dMap['Priya']._id,
      cargoWeightKg: 850,
      plannedDistanceKm: 60,
      status: 'Dispatched'
    });

    const trip4 = new Trip({
      tripCode: 'TR004',
      source: 'Vatva Industrial Area',
      destination: 'Sanand Warehouse',
      vehicleId: vMap['TRUCK-04']._id,
      driverId: dMap['Suresh']._id,
      cargoWeightKg: 3500,
      plannedDistanceKm: 45,
      status: 'Draft'
    });

    const trip6 = new Trip({
      tripCode: 'TR006',
      source: 'Mansa Depot',
      destination: 'Kalol Depot',
      vehicleId: vMap['VAN-05']._id,
      driverId: dMap['Alex']._id,
      cargoWeightKg: 300,
      plannedDistanceKm: 15,
      status: 'Cancelled'
    });

    await trip1.save();
    await trip2.save();
    await trip3.save();
    await trip4.save();
    await trip6.save();
    console.log('Seeded trips.');

    // 6. Seed Maintenance
    const maint1 = new MaintenanceLog({
      vehicleId: vMap['VAN-05']._id,
      serviceType: 'Oil Change',
      cost: 2500,
      date: new Date('2026-07-05'),
      status: 'Active',
      notes: 'Standard synthetic oil replacement and filter change.'
    });

    const maint2 = new MaintenanceLog({
      vehicleId: vMap['MINI-03']._id,
      serviceType: 'Tyre Replace',
      cost: 6200,
      date: new Date('2026-07-10'),
      status: 'Active',
      notes: 'Replaced front two tubeless tyres.'
    });

    const maint3 = new MaintenanceLog({
      vehicleId: vMap['TRUCK-11']._id,
      serviceType: 'Engine Repair',
      cost: 18000,
      date: new Date('2026-07-06'),
      status: 'Completed',
      notes: 'Repaired starter motor and fuel injector valve.'
    });

    await maint1.save();
    await maint2.save();
    await maint3.save();
    console.log('Seeded maintenance logs.');

    // 7. Seed Fuel Logs
    const fuelLogsData = [
      { vehicleId: vMap['VAN-05']._id, tripId: trip1._id, date: new Date('2026-07-05'), liters: 42, cost: 3150 },
      { vehicleId: vMap['TRUCK-11']._id, tripId: trip2._id, date: new Date('2026-07-06'), liters: 110, cost: 8400 },
      { vehicleId: vMap['MINI-08']._id, tripId: trip3._id, date: new Date('2026-07-06'), liters: 28, cost: 2050 }
    ];
    await FuelLog.insertMany(fuelLogsData);
    console.log('Seeded fuel logs.');

    // 8. Seed Expenses
    const expensesData = [
      { tripId: trip1._id, vehicleId: vMap['VAN-05']._id, toll: 120, other: 0, total: 120 },
      { tripId: trip2._id, vehicleId: vMap['TRUCK-11']._id, toll: 340, other: 150, linkedMaintenanceCost: 18000, total: 18490 }
    ];
    await Expense.insertMany(expensesData);
    console.log('Seeded expenses.');

    console.log('Data seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await closeDB();
    console.log('Seeding process complete.');
    process.exit(0);
  }
}

seedData();
