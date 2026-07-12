const express = require('express');
const {
  getMaintenanceLogs,
  getMaintenanceLog,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog
} = require('../controllers/maintenanceController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getMaintenanceLogs)
  .post(authorize('Fleet Manager'), createMaintenanceLog);

router
  .route('/:id')
  .get(getMaintenanceLog)
  .put(authorize('Fleet Manager'), updateMaintenanceLog)
  .delete(authorize('Fleet Manager'), deleteMaintenanceLog);

module.exports = router;
