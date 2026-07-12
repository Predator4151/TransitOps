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
  .get(getVehicles)
  .post(authorize('Fleet Manager', 'Dispatcher'), createVehicle);

router
  .route('/:id')
  .get(getVehicle)
  .put(authorize('Fleet Manager', 'Dispatcher'), updateVehicle)
  .delete(authorize('Fleet Manager'), deleteVehicle);

module.exports = router;
