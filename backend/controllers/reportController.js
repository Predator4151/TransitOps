const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const Maintenance = require('../models/Maintenance');
const FuelLog = require('../models/FuelLog');
const Expense = require('../models/Expense');

// @desc    Get dashboard metrics and data
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboardData = async (req, res) => {
  try {
    // 1. Core Counts
    const totalVehicles = await Vehicle.countDocuments();
    const activeVehicles = await Vehicle.countDocuments({ status: 'On Trip' });
    const availableVehicles = await Vehicle.countDocuments({ status: 'Available' });
    const inShopVehicles = await Vehicle.countDocuments({ status: 'In Shop' });
    const retiredVehicles = await Vehicle.countDocuments({ status: 'Retired' });

    const totalDrivers = await Driver.countDocuments();
    const activeDrivers = await Driver.countDocuments({ status: 'On Trip' });
    const availableDrivers = await Driver.countDocuments({ status: 'Available' });
    const suspendedDrivers = await Driver.countDocuments({ status: 'Suspended' });
    const offDutyDrivers = await Driver.countDocuments({ status: 'Off Duty' });
    const driversOnDuty = activeDrivers + availableDrivers;

    const activeTrips = await Trip.countDocuments({ status: 'Dispatched' });
    const pendingTrips = await Trip.countDocuments({ status: 'Draft' });
    const completedTrips = await Trip.countDocuments({ status: 'Completed' });
    const cancelledTrips = await Trip.countDocuments({ status: 'Cancelled' });

    // 2. Calculations
    // Fleet Utilization % = (Active Vehicles / (Total Vehicles - Retired)) * 100
    const nonRetiredVehicles = totalVehicles - retiredVehicles;
    const fleetUtilization = nonRetiredVehicles > 0 
      ? parseFloat(((activeVehicles / nonRetiredVehicles) * 100).toFixed(1))
      : 0;

    // Fuel Consumption (liters)
    const fuelLogs = await FuelLog.find();
    const totalFuelLiters = fuelLogs.reduce((sum, log) => sum + (log.fuelQuantity || 0), 0);

    // Total Operational Cost (sum of all expenses)
    const expenses = await Expense.find();
    const totalOperationalCost = expenses.reduce((sum, exp) => sum + (exp.cost || 0), 0);

    // Average Driver Safety Score
    const drivers = await Driver.find();
    const avgSafetyScore = drivers.length > 0
      ? parseFloat((drivers.reduce((sum, d) => sum + (d.safetyScore || 0), 0) / drivers.length).toFixed(1))
      : 0;

    // Pending Maintenance
    const pendingMaintenance = await Maintenance.countDocuments({ status: 'Active' });

    // 3. Table/Chart Data
    // Recent Trips
    const recentTrips = await Trip.find()
      .populate('vehicle')
      .populate('driver')
      .sort({ createdAt: -1 })
      .limit(6);

    // Recent Notifications (e.g. License expiring soon, low safety scores, in-shop alerts)
    const notifications = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // Check expiring licenses
    const expiringDrivers = await Driver.find({
      licenseExpiryDate: { $lte: thirtyDaysFromNow }
    }).limit(3);
    expiringDrivers.forEach(d => {
      const days = Math.ceil((new Date(d.licenseExpiryDate) - now) / (1000 * 60 * 60 * 24));
      notifications.push({
        type: days < 0 ? 'danger' : 'warning',
        message: `Driver ${d.name}'s license ${days < 0 ? 'expired' : 'is expiring in ' + days + ' days'} (${new Date(d.licenseExpiryDate).toLocaleDateString()})`,
        time: 'License Alert'
      });
    });

    // Check vehicles in shop
    const shopVehicles = await Vehicle.find({ status: 'In Shop' }).limit(3);
    shopVehicles.forEach(v => {
      notifications.push({
        type: 'info',
        message: `Vehicle ${v.registrationNumber} (${v.name}) is currently In Shop for maintenance.`,
        time: 'Maintenance Alert'
      });
    });

    // Low Safety Score
    const lowSafetyDrivers = await Driver.find({ safetyScore: { $lt: 85 } }).limit(2);
    lowSafetyDrivers.forEach(d => {
      notifications.push({
        type: 'warning',
        message: `Driver ${d.name} has a low safety score: ${d.safetyScore}/100`,
        time: 'Safety Alert'
      });
    });

    // Monthly Fuel Expense Data
    // Group fuel expenses by month
    const monthlyFuelExpenses = await Expense.aggregate([
      { $match: { expenseType: 'Fuel' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          total: { $sum: '$cost' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]);

    // Vehicle Status Counts for Pie Chart
    const vehicleStatusCounts = {
      Available: availableVehicles,
      'On Trip': activeVehicles,
      'In Shop': inShopVehicles,
      Retired: retiredVehicles
    };

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          activeVehicles,
          availableVehicles,
          inShopVehicles,
          driversOnDuty,
          activeTrips,
          pendingTrips,
          fleetUtilization,
          totalFuelLiters: parseFloat(totalFuelLiters.toFixed(1)),
          totalOperationalCost,
          avgSafetyScore,
          pendingMaintenance
        },
        recentTrips,
        notifications,
        charts: {
          vehicleStatusCounts,
          monthlyFuelExpenses
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed report and analytics data
// @route   GET /api/reports/analytics
// @access  Private
exports.getAnalyticsData = async (req, res) => {
  try {
    // 1. Vehicle ROI = [Revenue - (Maintenance + Fuel)] / Acquisition Cost
    // We assume Revenue = sum(actualDistance * $3.50) for completed trips
    // Fuel Cost = sum(cost in Expenses of type 'Fuel') for each vehicle
    // Maintenance Cost = sum(cost in Expenses of type 'Maintenance' or 'Repair') for each vehicle
    const vehicles = await Vehicle.find();
    const vehicleAnalytics = [];

    for (let vehicle of vehicles) {
      // Completed trips for vehicle
      const trips = await Trip.find({ vehicle: vehicle._id, status: 'Completed' });
      const totalDistance = trips.reduce((sum, t) => sum + (t.actualDistance || t.plannedDistance || 0), 0);
      const computedRevenue = totalDistance * 3.50; // Assume $3.50 per km revenue

      // Expenses breakdown
      const vehicleExpenses = await Expense.find({ vehicle: vehicle._id });
      const fuelCost = vehicleExpenses
        .filter(e => e.expenseType === 'Fuel')
        .reduce((sum, e) => sum + e.cost, 0);
      const maintenanceCost = vehicleExpenses
        .filter(e => e.expenseType === 'Maintenance' || e.expenseType === 'Repair')
        .reduce((sum, e) => sum + e.cost, 0);
      const otherCost = vehicleExpenses
        .filter(e => e.expenseType !== 'Fuel' && e.expenseType !== 'Maintenance' && e.expenseType !== 'Repair')
        .reduce((sum, e) => sum + e.cost, 0);

      const totalCost = fuelCost + maintenanceCost + otherCost;
      const netProfit = computedRevenue - totalCost;

      // ROI % = (Profit / AcquisitionCost) * 100
      const roi = vehicle.acquisitionCost > 0
        ? parseFloat(((netProfit / vehicle.acquisitionCost) * 100).toFixed(1))
        : 0;

      // Fuel Efficiency (Average distance covered per liter of fuel)
      const logs = await FuelLog.find({ vehicle: vehicle._id });
      const totalFuel = logs.reduce((sum, l) => sum + l.fuelQuantity, 0);
      const totalDistanceFuel = logs.reduce((sum, l) => sum + l.distanceCovered, 0);
      const avgFuelEfficiency = totalFuel > 0
        ? parseFloat((totalDistanceFuel / totalFuel).toFixed(2))
        : 0;

      vehicleAnalytics.push({
        id: vehicle._id,
        registrationNumber: vehicle.registrationNumber,
        name: vehicle.name,
        type: vehicle.type,
        acquisitionCost: vehicle.acquisitionCost,
        revenue: parseFloat(computedRevenue.toFixed(2)),
        costs: {
          fuel: fuelCost,
          maintenance: maintenanceCost,
          other: otherCost,
          total: totalCost
        },
        netProfit: parseFloat(netProfit.toFixed(2)),
        roi,
        fuelEfficiency: avgFuelEfficiency
      });
    }

    // 2. Global Expense Breakdown
    const expenseBreakdown = await Expense.aggregate([
      {
        $group: {
          _id: '$expenseType',
          total: { $sum: '$cost' }
        }
      }
    ]);

    // 3. Global Fuel Efficiency trend
    const recentFuelLogs = await FuelLog.find()
      .populate('vehicle', 'registrationNumber name')
      .sort({ date: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        vehicles: vehicleAnalytics,
        expenseBreakdown: expenseBreakdown.reduce((acc, curr) => {
          acc[curr._id] = curr.total;
          return acc;
        }, {}),
        recentFuelLogs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
