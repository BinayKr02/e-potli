const mongoose = require("mongoose");

var transactionSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

var transaction = mongoose.model("transaction", transactionSchema);
module.exports = transaction;
