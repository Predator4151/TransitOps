const express = require('express');
const {
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip
} = require('../controllers/tripController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getTrips)
  .post(authorize('Dispatcher', 'Fleet Manager'), createTrip);

router
  .route('/:id')
  .get(getTrip)
  .put(authorize('Dispatcher', 'Fleet Manager'), updateTrip)
  .delete(authorize('Fleet Manager'), deleteTrip);

module.exports = router;
