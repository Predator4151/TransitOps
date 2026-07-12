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
router.use(authorize('Safety Officer'));

router
  .route('/')
  .get(getDrivers)
  .post(createDriver);

router
  .route('/:id')
  .get(getDriver)
  .put(updateDriver)
  .delete(deleteDriver);

module.exports = router;
