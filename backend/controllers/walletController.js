import dotenv from "dotenv";
dotenv.config();

import Razorpay from "razorpay";
import crypto from "crypto";

const hasRazorpayConfig =
  Boolean(process.env.RAZORPAY_KEY_ID) &&
  Boolean(process.env.RAZORPAY_KEY_SECRET);

const shouldMockRazorpay =
  process.env.RAZORPAY_MOCK === "true" || !hasRazorpayConfig;

const razor = hasRazorpayConfig
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;


import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// Get wallet balance
export const getWallet = async (req, res) => {
  try {
    const userId = req.user._id;

    let wallet = await Wallet.findOne({ user_id: userId });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = new Wallet({
        user_id: userId,
        balance: 0,
        currency: 'INR'
      });
      await wallet.save();
    }

    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wallet'
    });
  }
};

// Create Razorpay order for wallet top-up
export const createWalletOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0"
      });
    }

    let order;

    if (!razor) {
      // Mock order for local/dev environments without Razorpay config
      order = {
        id: `order_mock_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `wallet_mock_${Date.now()}`
      };
    } else {
      order = await razor.orders.create({
        amount: Math.round(amount * 100), // convert to paise
        currency: "INR",
        receipt: `wallet_${Date.now()}`,
        notes: {
          user_id: req.user._id.toString(),
          type: 'wallet_recharge'
        }
      });
    }

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt
        }
      }
    });

  } catch (error) {
    console.error("Wallet Razorpay Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order"
    });
  }
};


// Add funds to wallet
export const addFunds = async (req, res) => {
  const session = await Wallet.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { amount, payment_method = 'razorpay', razorpay_payment_id } = req.body;

    if (!amount || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    let wallet = await Wallet.findOne({ user_id: userId });

    if (!wallet) {
      wallet = new Wallet({
        user_id: userId,
        balance: 0,
        currency: 'INR'
      });
    }

    // Add funds to wallet
    await wallet.addFunds(amount);

    // Create wallet transaction
    const walletTransaction = new WalletTransaction({
      wallet_id: wallet._id,
      transaction_type: 'credit',
      amount: amount,
      description: `Wallet top-up via ${payment_method}`,
      status: 'completed',
      balance_after: wallet.balance,
      gateway_transaction_id: razorpay_payment_id
    });
    await walletTransaction.save({ session });

    // Create notification
    await Notification.createNotification(userId, {
      title: 'Wallet Recharged',
      message: `Your wallet has been recharged with ₹${amount}. New balance: ₹${wallet.balance}`,
      type: 'payment',
      icon: 'wallet',
      is_important: true
    });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Funds added to wallet successfully',
      data: {
        wallet,
        transaction: walletTransaction
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Add funds error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding funds to wallet'
    });
  }
};

// Get wallet transactions
export const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, page = 1, type, start_date, end_date } = req.query;

    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
      return res.json({
        success: true,
        data: {
          transactions: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    }

    const filter = { wallet_id: wallet._id };
    
    if (type && type !== 'all') {
      filter.transaction_type = type;
    }
    
    if (start_date || end_date) {
      filter.createdAt = {};
      if (start_date) {
        const start = new Date(start_date);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const transactions = await WalletTransaction.find(filter)
      .populate('booking_id')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await WalletTransaction.countDocuments(filter);

    // Calculate transaction statistics
    const stats = await WalletTransaction.aggregate([
      { $match: { wallet_id: wallet._id } },
      {
        $group: {
          _id: '$transaction_type',
          count: { $sum: 1 },
          total_amount: { $sum: '$amount' }
        }
      }
    ]);

    const monthlyStats = await WalletTransaction.aggregate([
      { $match: { wallet_id: wallet._id } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          credit: {
            $sum: {
              $cond: [{ $eq: ['$transaction_type', 'credit'] }, '$amount', 0]
            }
          },
          debit: {
            $sum: {
              $cond: [{ $eq: ['$transaction_type', 'debit'] }, '$amount', 0]
            }
          },
          refund: {
            $sum: {
              $cond: [{ $eq: ['$transaction_type', 'refund'] }, '$amount', 0]
            }
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        wallet_balance: wallet.balance,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        statistics: {
          by_type: stats,
          monthly: monthlyStats
        }
      }
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wallet transactions'
    });
  }
};

// Transfer funds (if needed in future)
export const transferFunds = async (req, res) => {
  const session = await Wallet.startSession();
  session.startTransaction();

  try {
    const fromUserId = req.user._id;
    const { to_email, amount, description } = req.body;

    if (!to_email || !amount || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Valid recipient email and amount are required'
      });
    }

    // Get sender's wallet
    const fromWallet = await Wallet.findOne({ user_id: fromUserId });
    if (!fromWallet || !fromWallet.hasSufficientBalance(amount)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Get recipient user
    const toUser = await User.findOne({ email: to_email.toLowerCase() });
    if (!toUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    if (toUser._id.toString() === fromUserId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to yourself'
      });
    }

    // Get recipient's wallet
    let toWallet = await Wallet.findOne({ user_id: toUser._id });
    if (!toWallet) {
      toWallet = new Wallet({
        user_id: toUser._id,
        balance: 0,
        currency: 'INR'
      });
    }

    // Perform transfer
    await fromWallet.deductFunds(amount);
    await toWallet.addFunds(amount);

    // Create transactions for both parties
    const fromTransaction = new WalletTransaction({
      wallet_id: fromWallet._id,
      transaction_type: 'debit',
      amount: amount,
      description: description || `Transfer to ${toUser.email}`,
      status: 'completed',
      balance_after: fromWallet.balance
    });

    const toTransaction = new WalletTransaction({
      wallet_id: toWallet._id,
      transaction_type: 'credit',
      amount: amount,
      description: description || `Transfer from ${req.user.email}`,
      status: 'completed',
      balance_after: toWallet.balance
    });

    await fromTransaction.save({ session });
    await toTransaction.save({ session });

    // Create notifications
    await Notification.createNotification(fromUserId, {
      title: 'Funds Transferred',
      message: `You transferred ₹${amount} to ${toUser.email}. New balance: ₹${fromWallet.balance}`,
      type: 'payment',
      icon: 'send'
    });

    await Notification.createNotification(toUser._id, {
      title: 'Funds Received',
      message: `You received ₹${amount} from ${req.user.email}. New balance: ₹${toWallet.balance}`,
      type: 'payment',
      icon: 'receive'
    });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Funds transferred successfully',
      data: {
        from_balance: fromWallet.balance,
        to_balance: toWallet.balance,
        transaction: fromTransaction
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Transfer funds error:', error);
    res.status(500).json({
      success: false,
      message: 'Error transferring funds'
    });
  }
};

// Get wallet statistics
export const getWalletStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
      return res.json({
        success: true,
        data: {
          current_balance: 0,
          total_added: 0,
          total_spent: 0,
          total_refunded: 0,
          transaction_count: 0
        }
      });
    }

    const stats = await WalletTransaction.aggregate([
      { $match: { wallet_id: wallet._id } },
      {
        $group: {
          _id: '$transaction_type',
          total_amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      current_balance: wallet.balance,
      total_added: 0,
      total_spent: 0,
      total_refunded: 0,
      transaction_count: 0
    };

    stats.forEach(stat => {
      result.transaction_count += stat.count;
      if (stat._id === 'credit') {
        result.total_added += stat.total_amount;
      } else if (stat._id === 'debit') {
        result.total_spent += stat.total_amount;
      } else if (stat._id === 'refund') {
        result.total_refunded += stat.total_amount;
      }
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get wallet stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wallet statistics'
    });
  }
};

// Verify Razorpay payment & add money to wallet
export const verifyWalletPayment = async (req, res) => {
  const session = await Wallet.startSession();
  session.startTransaction();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount
    } = req.body;

    console.log('Verify Wallet Payment - Request body:', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: razorpay_signature ? 'present' : 'missing',
      amount,
      shouldMockRazorpay
    });

    if (!razorpay_order_id || !razorpay_payment_id || !amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification data"
      });
    }

    // Parse and validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    // Verify signature only if not in mock mode
    if (!shouldMockRazorpay) {
      if (!razorpay_signature) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Missing payment signature"
        });
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      console.log('Signature verification:', {
        expected: expectedSignature,
        received: razorpay_signature,
        match: expectedSignature === razorpay_signature
      });

      if (expectedSignature !== razorpay_signature) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature"
        });
      }
    } else {
      console.warn("⚠️  Skipping Razorpay signature verification (mock mode).");
    }

    // Check if this payment was already processed (prevent duplicate credits)
    const existingTx = await WalletTransaction.findOne({
      gateway_transaction_id: razorpay_payment_id,
      transaction_type: 'credit'
    }).session(session);

    if (existingTx) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "This payment has already been processed"
      });
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ user_id: req.user._id }).session(session);
    if (!wallet) {
      wallet = new Wallet({
        user_id: req.user._id,
        balance: 0,
        currency: 'INR'
      });
      await wallet.save({ session });
    }

    // Add funds
    await wallet.addFunds(parsedAmount);
    await wallet.save({ session });

    // Create transaction
    const tx = new WalletTransaction({
      wallet_id: wallet._id,
      transaction_type: "credit",
      amount: parsedAmount,
      description: "Wallet top-up via Razorpay",
      status: "completed",
      balance_after: wallet.balance,
      gateway_transaction_id: razorpay_payment_id
    });

    await tx.save({ session });

    // Create notification
    await Notification.createNotification(req.user._id, {
      title: 'Wallet Recharged',
      message: `Your wallet has been recharged with ₹${parsedAmount}. New balance: ₹${wallet.balance}`,
      type: 'payment',
      icon: 'wallet',
      is_important: true
    });

    await session.commitTransaction();
    session.endSession();

    console.log('Wallet verification successful:', {
      amount: parsedAmount,
      new_balance: wallet.balance,
      transaction_id: tx._id
    });

    res.json({
      success: true,
      message: "Wallet updated successfully",
      data: {
        wallet,
        transaction: tx,
        balance: wallet.balance
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Verify Wallet Payment Error:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
