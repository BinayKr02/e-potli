const { findByIdAndUpdate } = require("./models/wallet.js");
const wallet = require("./models/wallet.js");
const transactions = require("./models/transaction");
class Transaction {
  static async isWalletValid(id) {
    let tempList = await wallet.find({ _id: id });
    if (tempList.length == 0) {
      return false;
    }
    return true;
  }
  static async isBalanceAvailable(id, amount) {
    let tempList = await wallet.find({ _id: id });
    if (tempList[0].balance >= amount) {
      return true;
    }
    return false;
  }

  static async topUp(id, amount) {
    let tempList = await wallet.find({ _id: id });
    console.log(tempList);
    let temp = await wallet.findByIdAndUpdate(
      { _id: id },
      { balance: tempList[0].balance + amount }
    );
    return temp;
  }

  static async transfer(from, to, amount) {
    let a = await Transaction.isWalletValid(from);
    let b = await Transaction.isWalletValid(to);
    let c = await Transaction.isBalanceAvailable(from, amount);

    if (a && b && c) {
      let tempList1 = await wallet.find({ _id: from });
      let temp = await wallet.findByIdAndUpdate(
        { _id: from },
        { balance: tempList1[0].balance - amount }
      );
      let tempList2 = await wallet.find({ _id: to });
      let temp1 = await wallet.findByIdAndUpdate(
        { _id: to },
        { balance: tempList2[0].balance + amount }
      );
      let temp_transaction = new transactions({ from, to, amount });
      let data = await temp_transaction.save();
      //  console.log(data);
      return true;
    }
    return false;
  }
}

module.exports = Transaction;
