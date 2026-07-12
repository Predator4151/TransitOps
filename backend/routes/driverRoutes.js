const express = require('express');
const {
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver
} = require('../controllers/driverController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getDrivers)
  .post(authorize('Fleet Manager', 'Dispatcher', 'Safety Officer'), createDriver);

router
  .route('/:id')
  .get(getDriver)
  .put(authorize('Fleet Manager', 'Dispatcher', 'Safety Officer'), updateDriver)
  .delete(authorize('Fleet Manager'), deleteDriver);

module.exports = router;
