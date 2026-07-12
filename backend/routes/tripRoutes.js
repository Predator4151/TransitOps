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
router.use(authorize('Dispatcher'));

router
  .route('/')
  .get(getTrips)
  .post(createTrip);

router
  .route('/:id')
  .get(getTrip)
  .put(updateTrip)
  .delete(deleteTrip);

module.exports = router;
