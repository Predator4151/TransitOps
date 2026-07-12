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
router.use(authorize('Financial Analyst'));

router
  .route('/')
  .get(getFuelLogs)
  .post(createFuelLog);

router
  .route('/:id')
  .get(getFuelLog)
  .put(updateFuelLog)
  .delete(deleteFuelLog);

module.exports = router;
