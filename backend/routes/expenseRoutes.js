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
  .post(authorize('Financial Analyst'), createExpense);

router
  .route('/:id')
  .get(getExpense)
  .put(authorize('Financial Analyst'), updateExpense)
  .delete(authorize('Financial Analyst'), deleteExpense);

module.exports = router;
