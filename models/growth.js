const mongoose = require("mongoose");

var priceSchema = new mongoose.Schema({
  onDate: {
    type: Date,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
});
var price = mongoose.model("price", priceSchema);
module.exports = price;
