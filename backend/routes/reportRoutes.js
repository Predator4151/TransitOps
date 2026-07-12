const express = require('express');
const { getDashboardData, getAnalyticsData } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', authorize('Dispatcher'), getDashboardData);
router.get('/analytics', authorize('Financial Analyst'), getAnalyticsData);

module.exports = router;
