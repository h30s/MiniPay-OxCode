import { Router } from 'express';
import {
  getWalletSummary,
  getTransactions,
  getTransaction,
  createTransaction,
  deleteTransaction,
  getMonthlySummary,
} from '../controllers/transactionController';

const router = Router();

// Wallet summary
router.get('/wallet', getWalletSummary);

// Monthly expense summary
router.get('/summary/monthly', getMonthlySummary);

// Transactions CRUD
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransaction);
router.post('/transactions', createTransaction);
router.delete('/transactions/:id', deleteTransaction);

export default router;