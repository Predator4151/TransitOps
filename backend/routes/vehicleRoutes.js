const express = require('express');
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehicleController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorize('Fleet Manager', 'Dispatcher', 'Financial Analyst'), getVehicles)
  .post(authorize('Fleet Manager'), createVehicle);

router
  .route('/:id')
  .get(authorize('Fleet Manager', 'Dispatcher', 'Financial Analyst'), getVehicle)
  .put(authorize('Fleet Manager'), updateVehicle)
  .delete(authorize('Fleet Manager'), deleteVehicle);

module.exports = router;
