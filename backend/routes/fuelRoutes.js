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
  .post(authorize('Financial Analyst'), createFuelLog);

router
  .route('/:id')
  .get(getFuelLog)
  .put(authorize('Financial Analyst'), updateFuelLog)
  .delete(authorize('Financial Analyst'), deleteFuelLog);

module.exports = router;
