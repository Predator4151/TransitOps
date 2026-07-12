const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const Maintenance = require('../models/Maintenance');
const FuelLog = require('../models/FuelLog');
const Expense = require('../models/Expense');

const seedDatabase = async () => {
  try {
    // 1. Check if database has data already
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already has data. Skipping seeder...');
      return;
    }

    console.log('Seeding database...');

    // Clear existing data (in case there's partial data)
    await User.deleteMany();
    await Vehicle.deleteMany();
    await Driver.deleteMany();
    await Trip.deleteMany();
    await Maintenance.deleteMany();
    await FuelLog.deleteMany();
    await Expense.deleteMany();

    // 2. Create Users
    const users = await User.create([
      { name: 'System Admin', email: 'admin@transitops.com', password: 'Admin@123', role: 'Fleet Manager' },
      { name: 'John Dispatcher', email: 'dispatcher@transitops.com', password: 'Admin@123', role: 'Dispatcher' },
      { name: 'Sarah Safety', email: 'safety@transitops.com', password: 'Admin@123', role: 'Safety Officer' },
      { name: 'Frank Financial', email: 'analyst@transitops.com', password: 'Admin@123', role: 'Financial Analyst' }
    ]);

    // 3. Create 12 Vehicles
    const vehicleData = [
      { registrationNumber: 'TO-101', name: 'Ford Transit', model: 'Transit 350', type: 'Van', maxLoadCapacity: 1500, currentOdometer: 124500, acquisitionCost: 45000, status: 'Available' },
      { registrationNumber: 'TO-102', name: 'Mercedes Sprinter', model: 'Sprinter 2500', type: 'Sprinter', maxLoadCapacity: 1800, currentOdometer: 98200, acquisitionCost: 52000, status: 'Available' },
      { registrationNumber: 'TO-103', name: 'Freightliner Cascadia', model: 'Cascadia 126', type: 'Semi', maxLoadCapacity: 22000, currentOdometer: 345000, acquisitionCost: 145000, status: 'Available' },
      { registrationNumber: 'TO-104', name: 'Peterbilt 579', model: '579 Sleeper', type: 'Semi', maxLoadCapacity: 24000, currentOdometer: 215400, acquisitionCost: 160000, status: 'Available' },
      { registrationNumber: 'TO-105', name: 'GMC Savana', model: 'Savana Cargo', type: 'Cargo Van', maxLoadCapacity: 1600, currentOdometer: 156300, acquisitionCost: 38000, status: 'Available' },
      { registrationNumber: 'TO-106', name: 'Isuzu NPR', model: 'NPR-HD Box Truck', type: 'Truck', maxLoadCapacity: 6500, currentOdometer: 85200, acquisitionCost: 65000, status: 'Available' },
      { registrationNumber: 'TO-107', name: 'Hino 268', model: '268 Box Truck', type: 'Truck', maxLoadCapacity: 8000, currentOdometer: 112000, acquisitionCost: 72000, status: 'In Shop' },
      { registrationNumber: 'TO-108', name: 'Chevrolet Express', model: 'Express 3500', type: 'Cargo Van', maxLoadCapacity: 1550, currentOdometer: 189400, acquisitionCost: 35000, status: 'Available' },
      { registrationNumber: 'TO-109', name: 'Ram ProMaster', model: 'ProMaster 3500', type: 'Sprinter', maxLoadCapacity: 2000, currentOdometer: 64200, acquisitionCost: 48000, status: 'Available' },
      { registrationNumber: 'TO-110', name: 'Volvo VNL', model: 'VNL 860', type: 'Semi', maxLoadCapacity: 23000, currentOdometer: 423000, acquisitionCost: 155000, status: 'Retired' },
      { registrationNumber: 'TO-111', name: 'Ford F-550', model: 'Super Duty Flatbed', type: 'Flatbed', maxLoadCapacity: 9000, currentOdometer: 76000, acquisitionCost: 82000, status: 'Available' },
      { registrationNumber: 'TO-112', name: 'Kenworth T680', model: 'T680 High Roof', type: 'Semi', maxLoadCapacity: 24500, currentOdometer: 145000, acquisitionCost: 168000, status: 'Available' }
    ];
    const vehicles = await Vehicle.create(vehicleData);

    // 4. Create 18 Drivers
    const driverData = [];
    const licenseCategories = ['Class A', 'Class B', 'Class C', 'Commercial'];
    const names = [
      'James Smith', 'John Jones', 'Robert Miller', 'Michael Davis', 'William Rodriguez',
      'David Martinez', 'Richard Hernandez', 'Joseph Lopez', 'Thomas Gonzalez', 'Charles Wilson',
      'Christopher Anderson', 'Daniel Thomas', 'Matthew Taylor', 'Anthony Moore', 'Mark Jackson',
      'Donald Martin', 'Steven Lee', 'Paul Perez'
    ];

    for (let i = 0; i < 18; i++) {
      let status = 'Available';
      if (i === 6) status = 'Suspended';
      else if (i === 11) status = 'Off Duty';

      // Set driver safety scores
      let safetyScore = 95 - (i % 5) * 4; // realistic distribution between 75 and 100
      if (i === 6) safetyScore = 65; // Suspended driver has a low safety score

      // Generate expiry dates
      let expiryDate = new Date();
      if (i === 15) {
        // Expired license
        expiryDate.setMonth(expiryDate.getMonth() - 2);
      } else {
        // Valid license
        expiryDate.setMonth(expiryDate.getMonth() + 10 + (i * 2));
      }

      driverData.push({
        name: names[i],
        licenseNumber: `LIC-9908-${2345 + i}`,
        licenseCategory: licenseCategories[i % licenseCategories.length],
        licenseExpiryDate: expiryDate,
        phoneNumber: `+1-555-019-${1000 + i}`,
        safetyScore,
        status
      });
    }
    const drivers = await Driver.create(driverData);

    // 5. Create 10 Maintenance Logs
    const maintenanceTypes = ['Routine Oil Change', 'Tire Rotation', 'Brake Repair', 'Engine Tune-up', 'Transmission Service', 'Inspection'];
    const maintenanceLogs = [];
    
    // Create 7 Closed Maintenance logs with Expense entries
    for (let i = 0; i < 7; i++) {
      const v = vehicles[i % vehicles.length];
      const mDate = new Date();
      mDate.setDate(mDate.getDate() - 15 * (i + 1));
      const cost = 150 + i * 220;

      const log = await Maintenance.create({
        vehicle: v._id,
        maintenanceType: maintenanceTypes[i % maintenanceTypes.length],
        description: `Routine scheduled checkup, parts and labor included.`,
        date: mDate,
        cost,
        status: 'Closed',
        closingDate: mDate
      });
      maintenanceLogs.push(log);

      // Log corresponding Expense
      await Expense.create({
        vehicle: v._id,
        expenseType: 'Maintenance',
        date: mDate,
        cost,
        description: `Maintenance: ${log.maintenanceType} (Closed)`
      });
    }

    // Create 3 Active Maintenance logs (status Active, vehicle status should be In Shop)
    // Vehicle TO-107 is status 'In Shop'
    const activeVehiclesInShop = vehicles.filter(v => v.status === 'In Shop');
    for (let i = 0; i < 3; i++) {
      const v = activeVehiclesInShop[0] || vehicles[6]; // Vehicle TO-107 or similar
      const mDate = new Date();
      mDate.setDate(mDate.getDate() - i);
      const log = await Maintenance.create({
        vehicle: v._id,
        maintenanceType: maintenanceTypes[(i + 2) % maintenanceTypes.length],
        description: `Ongoing repair work in progress.`,
        date: mDate,
        cost: 450 + i * 150,
        status: 'Active'
      });
      maintenanceLogs.push(log);
    }

    // 6. Create 40 Fuel Logs (creating these will also create 40 Fuel expenses)
    const fuelLogs = [];
    for (let i = 0; i < 40; i++) {
      const v = vehicles[i % vehicles.length];
      const qty = 50 + (i % 6) * 15; // 50 to 125 Liters
      const dist = qty * (7 + (i % 5)); // Fuel efficiency 7 to 11 km/L
      const cost = Math.round(qty * 1.45 * 100) / 100; // $1.45/L
      const fDate = new Date();
      fDate.setDate(fDate.getDate() - 4 - i);

      const log = await FuelLog.create({
        vehicle: v._id,
        date: fDate,
        fuelQuantity: qty,
        fuelCost: cost,
        distanceCovered: dist
      });
      fuelLogs.push(log);

      // Log Fuel Expense
      await Expense.create({
        vehicle: v._id,
        expenseType: 'Fuel',
        date: fDate,
        cost,
        description: `Fuel Purchase: ${qty}L for ${dist}km (Fuel Log Ref: ${log._id})`
      });
    }

    // 7. Create 25 Trips
    const cities = ['Seattle', 'Tacoma', 'Portland', 'Vancouver', 'Spokane', 'Boise', 'Salt Lake City', 'Denver', 'Cheyenne', 'Helena'];
    const tripData = [];

    // We need 15 Completed trips
    for (let i = 0; i < 15; i++) {
      const v = vehicles[i % vehicles.length];
      const d = drivers[i % drivers.length];
      const planned = 150 + i * 45;
      const actual = planned + (i % 3) * 5;
      const weight = 300 + i * 80;

      tripData.push({
        source: cities[i % cities.length],
        destination: cities[(i + 1) % cities.length],
        vehicle: v._id,
        driver: d._id,
        cargoWeight: weight,
        plannedDistance: planned,
        status: 'Completed',
        actualDistance: actual,
        fuelConsumed: Math.round((actual / 8.5) * 10) / 10,
        finalOdometer: v.currentOdometer + actual
      });
    }

    // Create 4 Dispatched trips (and change Vehicle and Driver status to On Trip)
    const availableVehiclesList = vehicles.filter(v => v.status === 'Available');
    const availableDriversList = drivers.filter(d => d.status === 'Available' && new Date(d.licenseExpiryDate) > new Date());

    for (let i = 0; i < 4; i++) {
      const v = availableVehiclesList[i % availableVehiclesList.length];
      const d = availableDriversList[i % availableDriversList.length];
      const planned = 200 + i * 60;
      const weight = 400 + i * 100;

      tripData.push({
        source: cities[(i + 2) % cities.length],
        destination: cities[(i + 4) % cities.length],
        vehicle: v._id,
        driver: d._id,
        cargoWeight: weight,
        plannedDistance: planned,
        status: 'Dispatched'
      });

      // Update vehicle & driver to On Trip
      v.status = 'On Trip';
      await v.save();

      d.status = 'On Trip';
      await d.save();
    }

    // Create 3 Draft trips
    for (let i = 0; i < 3; i++) {
      const v = vehicles[(i + 4) % vehicles.length];
      const d = drivers[(i + 4) % drivers.length];
      tripData.push({
        source: cities[(i + 3) % cities.length],
        destination: cities[(i + 5) % cities.length],
        vehicle: v._id,
        driver: d._id,
        cargoWeight: 500,
        plannedDistance: 120,
        status: 'Draft'
      });
    }

    // Create 3 Cancelled trips
    for (let i = 0; i < 3; i++) {
      const v = vehicles[(i + 5) % vehicles.length];
      const d = drivers[(i + 5) % drivers.length];
      tripData.push({
        source: cities[(i + 1) % cities.length],
        destination: cities[(i + 3) % cities.length],
        vehicle: v._id,
        driver: d._id,
        cargoWeight: 800,
        plannedDistance: 310,
        status: 'Cancelled'
      });
    }

    await Trip.create(tripData);

    // 8. Create additional manual Expense records
    // Currently, we have 7 Maintenance expenses and 40 Fuel expenses = 47 total.
    // Let's create some manual Toll, Insurance, and Miscellaneous expenses to satisfy 30 extra Expense entries.
    const extraExpenses = [];
    const expTypes = ['Toll', 'Insurance', 'Repair', 'Miscellaneous'];
    for (let i = 0; i < 30; i++) {
      const v = vehicles[i % vehicles.length];
      const cost = 25 + (i % 5) * 85; // $25 to $365
      const exDate = new Date();
      exDate.setDate(exDate.getDate() - (i + 1) * 3);

      extraExpenses.push({
        vehicle: v._id,
        expenseType: expTypes[i % expTypes.length],
        date: exDate,
        cost,
        description: `${expTypes[i % expTypes.length]} expense for vehicle ${v.registrationNumber}`
      });
    }
    await Expense.create(extraExpenses);

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
  }
};

module.exports = seedDatabase;
