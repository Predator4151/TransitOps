const express = require('express');
const { getDashboardData, getAnalyticsData } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardData);
router.get('/analytics', getAnalyticsData);

module.exports = router;
