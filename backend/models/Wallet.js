import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_transaction_date: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Methods
walletSchema.methods.hasSufficientBalance = function(amount) {
  return this.balance >= amount;
};

walletSchema.methods.addFunds = function(amount) {
  this.balance += amount;
  this.last_transaction_date = new Date();
  return this.save();
};

walletSchema.methods.deductFunds = function(amount) {
  if (!this.hasSufficientBalance(amount)) {
    throw new Error("Insufficient balance");
  }
  this.balance -= amount;
  this.last_transaction_date = new Date();
  return this.save();
};

export default mongoose.model("Wallet", walletSchema);
