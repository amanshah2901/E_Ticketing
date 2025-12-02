import express from 'express';
import {
  getWallet,
  addFunds,
  getWalletTransactions,
  transferFunds,
  getWalletStats
} from '../controllers/walletController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(auth);

router.get('/', getWallet);
router.post('/add-funds', addFunds);
router.get('/transactions', getWalletTransactions);
router.post('/transfer', transferFunds);
router.get('/stats', getWalletStats);

export default router;