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
  .post(authorize('Dispatcher'), createTrip);

router
  .route('/:id')
  .get(getTrip)
  .put(authorize('Dispatcher'), updateTrip)
  .delete(authorize('Dispatcher'), deleteTrip);

module.exports = router;
