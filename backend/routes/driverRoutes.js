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
  .get(authorize('Safety Officer', 'Dispatcher'), getDrivers)
  .post(authorize('Safety Officer'), createDriver);

router
  .route('/:id')
  .get(authorize('Safety Officer', 'Dispatcher'), getDriver)
  .put(authorize('Safety Officer'), updateDriver)
  .delete(authorize('Safety Officer'), deleteDriver);

module.exports = router;
