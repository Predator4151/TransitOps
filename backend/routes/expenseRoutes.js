const express = require('express');
const {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getOperationalCosts
} = require('../controllers/expenseController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/operational-costs', getOperationalCosts);

router
  .route('/')
  .get(getExpenses)
  .post(authorize('Fleet Manager', 'Financial Analyst'), createExpense);

router
  .route('/:id')
  .get(getExpense)
  .put(authorize('Fleet Manager', 'Financial Analyst'), updateExpense)
  .delete(authorize('Fleet Manager'), deleteExpense);

module.exports = router;
