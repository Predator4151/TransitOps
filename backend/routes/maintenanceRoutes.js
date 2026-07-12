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
router.use(authorize('Fleet Manager'));

router
  .route('/')
  .get(getMaintenanceLogs)
  .post(createMaintenanceLog);

router
  .route('/:id')
  .get(getMaintenanceLog)
  .put(updateMaintenanceLog)
  .delete(deleteMaintenanceLog);

module.exports = router;
