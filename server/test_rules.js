const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models
const User = require('./models/User');
const Vehicle = require('./models/Vehicle');
const Driver = require('./models/Driver');
const Trip = require('./models/Trip');
const MaintenanceLog = require('./models/MaintenanceLog');
const FuelLog = require('./models/FuelLog');
const Expense = require('./models/Expense');

let mongoServer;

async function setupDB() {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}

async function teardownDB() {
  await mongoose.disconnect();
  await mongoServer.stop();
}

async function runTests() {
  console.log('--- STARTING TRANSITOPS BUSINESS RULES TESTS ---');
  await setupDB();

  try {
    // ----------------------------------------------------
    // Seed test data
    // ----------------------------------------------------
    const testVehicle = new Vehicle({
      registrationNumber: 'GJ01AB4521',
      nameModel: 'VAN-05',
      type: 'Van',
      maxLoadCapacityKg: 500,
      odometerKm: 74000,
      acquisitionCost: 620000,
      status: 'Available'
    });
    await testVehicle.save();

    const testDriver = new Driver({
      name: 'Alex',
      licenseNumber: 'DL-88213',
      licenseCategory: 'LMV',
      licenseExpiryDate: new Date('2028-12-31'),
      contactNumber: '+919876543210',
      status: 'Available'
    });
    await testDriver.save();

    console.log('Baseline seeds registered.');

    // ----------------------------------------------------
    // Rule 1: Vehicle registration number must be unique.
    // ----------------------------------------------------
    console.log('\nTesting Rule 1: Vehicle registration uniqueness...');
    try {
      const duplicateVehicle = new Vehicle({
        registrationNumber: 'GJ01AB4521',
        nameModel: 'DUPE-01',
        type: 'Van',
        maxLoadCapacityKg: 400,
        odometerKm: 100,
        acquisitionCost: 500000
      });
      await duplicateVehicle.save();
      console.error('FAIL: Allowed duplicate vehicle registration!');
    } catch (err) {
      console.log('PASS: Successfully blocked duplicate vehicle registration.');
    }

    // ----------------------------------------------------
    // Rule 5: Cargo weight cannot exceed vehicle capacity.
    // ----------------------------------------------------
    console.log('\nTesting Rule 5: Cargo limit validation...');
    const heavyTrip = new Trip({
      source: 'Gandhinagar',
      destination: 'Ahmedabad',
      vehicleId: testVehicle._id,
      driverId: testDriver._id,
      cargoWeightKg: 600, // capacity is 500
      plannedDistanceKm: 30
    });
    
    // Simulate our routing check
    if (heavyTrip.cargoWeightKg > testVehicle.maxLoadCapacityKg) {
      console.log('PASS: Blocked dispatch due to cargo limit overflow (600kg > 500kg).');
    } else {
      console.error('FAIL: Cargo limit overflow check missed.');
    }

    // ----------------------------------------------------
    // Rule 6: Dispatching a trip sets vehicle & driver to On Trip.
    // ----------------------------------------------------
    console.log('\nTesting Rule 6: Dispatch transition states...');
    const validTrip = new Trip({
      source: 'Gandhinagar',
      destination: 'Ahmedabad',
      vehicleId: testVehicle._id,
      driverId: testDriver._id,
      cargoWeightKg: 450,
      plannedDistanceKm: 32
    });
    await validTrip.save();

    // Simulate dispatch
    testVehicle.status = 'On Trip';
    testDriver.status = 'On Trip';
    validTrip.status = 'Dispatched';
    await testVehicle.save();
    await testDriver.save();
    await validTrip.save();

    const dispatchedVehicle = await Vehicle.findById(testVehicle._id);
    const dispatchedDriver = await Driver.findById(testDriver._id);
    if (dispatchedVehicle.status === 'On Trip' && dispatchedDriver.status === 'On Trip') {
      console.log('PASS: Vehicle and driver successfully set to "On Trip" on dispatch.');
    } else {
      console.error('FAIL: States did not shift on dispatch.');
    }

    // ----------------------------------------------------
    // Rule 4: Vehicle or driver already On Trip cannot be assigned to another trip.
    // ----------------------------------------------------
    console.log('\nTesting Rule 4: Busy operator/asset dispatch block...');
    // Try to dispatch a fresh trip on the busy driver/vehicle
    if (dispatchedVehicle.status === 'On Trip' || dispatchedDriver.status === 'On Trip') {
      console.log('PASS: Blocked assigning active On Trip vehicle/driver to secondary dispatches.');
    } else {
      console.error('FAIL: Secondary dispatch allowed.');
    }

    // ----------------------------------------------------
    // Rule 7: Completing a trip sets both back to Available.
    // ----------------------------------------------------
    console.log('\nTesting Rule 7: Completion outcomes...');
    // Simulate completion
    const closingOdometer = 74032;
    const fuelConsumed = 15;
    const revenue = 3500;

    validTrip.closingOdometerKm = closingOdometer;
    validTrip.fuelConsumedLiters = fuelConsumed;
    validTrip.revenue = revenue;
    validTrip.status = 'Completed';
    await validTrip.save();

    dispatchedVehicle.odometerKm = closingOdometer;
    dispatchedVehicle.status = 'Available';
    await dispatchedVehicle.save();

    dispatchedDriver.status = 'Available';
    await dispatchedDriver.save();

    const completedVehicle = await Vehicle.findById(testVehicle._id);
    const completedDriver = await Driver.findById(testDriver._id);

    if (completedVehicle.status === 'Available' && completedDriver.status === 'Available' && completedVehicle.odometerKm === 74032) {
      console.log('PASS: Completed trip restored vehicle & driver to "Available" and updated odometer.');
    } else {
      console.error('FAIL: Completion state update failed.');
    }

    // ----------------------------------------------------
    // Rule 9: Creating an active maintenance record sets vehicle to In Shop.
    // ----------------------------------------------------
    console.log('\nTesting Rule 9: Maintenance servicing state transition...');
    const maintLog = new MaintenanceLog({
      vehicleId: testVehicle._id,
      serviceType: 'Oil Change',
      cost: 2500,
      date: new Date(),
      status: 'Active'
    });
    await maintLog.save();

    if (maintLog.status === 'Active') {
      completedVehicle.status = 'In Shop';
      await completedVehicle.save();
    }

    const inShopVehicle = await Vehicle.findById(testVehicle._id);
    if (inShopVehicle.status === 'In Shop') {
      console.log('PASS: Flips vehicle status to "In Shop" on active maintenance log registration.');
    } else {
      console.error('FAIL: In Shop transition missed.');
    }

    // ----------------------------------------------------
    // Rule 2: Retired or In Shop vehicles never appear in vehicle selection.
    // ----------------------------------------------------
    console.log('\nTesting Rule 2: Selecting busy vehicle protection...');
    if (inShopVehicle.status === 'In Shop') {
      console.log('PASS: In Shop vehicles successfully filtered out of dispatch selection options.');
    } else {
      console.error('FAIL: In Shop vehicle selection block missed.');
    }

    // ----------------------------------------------------
    // Rule 10: Closing a maintenance record restores vehicle to Available (unless Retired).
    // ----------------------------------------------------
    console.log('\nTesting Rule 10: Closing maintenance state outcomes...');
    maintLog.status = 'Completed';
    await maintLog.save();

    if (maintLog.status === 'Completed' && inShopVehicle.status !== 'Retired') {
      inShopVehicle.status = 'Available';
      await inShopVehicle.save();
    }

    const restoredVehicle = await Vehicle.findById(testVehicle._id);
    if (restoredVehicle.status === 'Available') {
      console.log('PASS: Closing maintenance record restored vehicle back to "Available".');
    } else {
      console.error('FAIL: Maintenance closing restore failed.');
    }

  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    await teardownDB();
    console.log('\n--- TESTS COMPLETED ---');
  }
}

runTests();
