const express = require('express');
const {
  getFuelLogs,
  getFuelLog,
  createFuelLog,
  updateFuelLog,
  deleteFuelLog
} = require('../controllers/fuelController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getFuelLogs)
  .post(authorize('Fleet Manager', 'Dispatcher'), createFuelLog);

router
  .route('/:id')
  .get(getFuelLog)
  .put(authorize('Fleet Manager', 'Dispatcher'), updateFuelLog)
  .delete(authorize('Fleet Manager'), deleteFuelLog);

module.exports = router;
