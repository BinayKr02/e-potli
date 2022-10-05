const mongoose = require("mongoose");

const withdrawlSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: Boolean,
    required: true,
    default: false,
  },
  type_withdrawl: {
    type: String,
    required: true,
  },
});

const withdrawl = mongoose.model("withdrawl", withdrawlSchema);
module.exports = withdrawl;
