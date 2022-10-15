const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  fname: {
    type: String,
    required: true,
  },
  lname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
    required: true,
    default: false,
  },
  verifyId: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0.0,
  },
  investment: {
    type: Number,
    required: true,
    default: 0.0,
  },
  currentInvestment: {
    type: Number,
    required: true,
    default: 0.0,
  },
});

var wallet = mongoose.model("wallet", walletSchema);
module.exports = wallet;
