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
router.use(authorize('Financial Analyst'));

router.get('/operational-costs', getOperationalCosts);

router
  .route('/')
  .get(getExpenses)
  .post(createExpense);

router
  .route('/:id')
  .get(getExpense)
  .put(updateExpense)
  .delete(deleteExpense);

module.exports = router;
