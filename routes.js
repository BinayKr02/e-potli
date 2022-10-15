const router = require("express").Router();
const middlewares = require("./middlewares.js");
const uuid = require("uuid").v1();
const express = require("express");
const wallet = require("./models/wallet.js");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const Transaction = require("./transaction.js");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const transactions = require("./models/transaction.js");
const growth = require("./models/growth.js");
const crypto = require("crypto-js/sha512");
const withdrawl = require("./models/withdrawl.js");
router.use(express.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.use(cookieParser());

router.get("/", (req, res) => {
  res.render("home");
});

router.get("/sign-up", (req, res) => {
  res.render("signup");
});

router.post("/createWallet", async (req, res) => {
  var { fname, lname, email, password, phone } = req.body;

  if (!fname || !lname || !email || !password || !phone) {
    res.json({ code: 404, message: "Enter all the fields" });
  }

  var temp_verification_id = uuid + Date.now();
  let hashedPassword = await bcrypt.hash(password, 10);
  const new_wallet = new wallet({
    fname,
    lname,
    email,
    password: hashedPassword,
    phone,
    verifyId: temp_verification_id,
  });
  new_wallet
    .save()
    .then((confirmation) => {
      res.json({
        code: 200,
        message:
          "Wallet Created Successfully, Please check your email and verify",
      });
      send_verification_mail(temp_verification_id, email);
    })
    .catch((error) => {
      if (error.code == 11000)
        res.json({
          code: 404,
          message: "User already registed with the given email ID",
        });
      else {
        console.log(error);
        res.json({
          code: 404,
          message: "Some Error Occured, Please try after some time",
        });
      }
    });
});

async function loginChecker(req, res, next) {
  var token = req.cookies.jwt;
  if (!token) {
    next();
  } else {
    try {
      let payload = jwt.verify(token, process.env.password);

      res.redirect("/console");
      //console.log(tempUser)
    } catch (error) {
      next();
    }
  }
}

router.get("/login", loginChecker, (req, res) => {
  res.render("login");
});

router.post("/login", async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    res.json({ code: 404, message: "Please enter both email and password" });
  } else {
    let user = await wallet.find({ email });
    if (user.length == 0) {
      res.json({ code: 404, message: "User not found" });
    } else {
      try {
        let temp = await bcrypt.compare(password, user[0].password);
        if (temp) {
          let payload = { id: user[0]._id };
          let token = jwt.sign(payload, process.env.password);
          res.cookie("jwt", token);
          res.json({ code: 200, message: "Login Successful" });
        } else {
          res.json({ code: 404, message: "Incorrect Password" });
        }
      } catch (error) {
        res.json({ code: 404, message: "Incorrect Password" });
      }
    }
  }
});

async function checkVerfied(req, res, next) {
  if (!req.cookies.jwt) {
    res.redirect("/login");
  } else {
    var token = req.cookies.jwt;
    //console.log(token)
    //console.log(token)
    try {
      let payload = jwt.verify(token, process.env.password);
      let tempUser = await wallet.findById({ _id: payload.id });
      //console.log(tempUser)
      if (tempUser.verified) {
        next();
      } else {
        res.render("notyetverified");
      }
      //console.log(tempUser)
    } catch (error) {
      res.render("someerroroccured");
    }
  }
}

async function loginVerifier(req, res, next) {
  var token = req.cookies.jwt;
  if (!token) {
    res.redirect("/login");
  } else {
    try {
      let payload = jwt.verify(token, process.env.password);

      next();
      //console.log(tempUser)
    } catch (error) {
      res.redirect("/login");
    }
  }
}

router.get("/console", checkVerfied, async (req, res) => {
  var token = req.cookies.jwt;
  try {
    let payload = jwt.verify(token, process.env.password);
    let tempUser = await wallet.findById({ _id: payload.id });
    let all_transaction = await transactions.find({
      $or: [{ from: payload.id }, { to: payload.id }],
    });
    res.render("console", {
      fname: tempUser.fname,
      balance: tempUser.balance,
      investment: tempUser.investment,
      currentInvestment: tempUser.currentInvestment,
      id: tempUser._id,
      all_transaction,
    });
  } catch (error) {
    res.render("someerroroccured");
  }
});
router.post("/confirmDeposit", loginVerifier, async (req, res) => {
  let payload = jwt.verify(req.cookies.jwt, process.env.password);
  let key = "y8MbU3Jm";
  let salt = "48WeKjdj";
  let user = await wallet.findById({ _id: payload.id });
  let amount = parseFloat(req.body.amount);
  // console.log(amount)
  let { fname, lname, email, phone } = user;
  let txnid = user._id + "-" + Date.now();
  //   console.log(`${key}|${txnid}|${amount.toString()}|${'deposit'}|${fname}|${email}|||||||||||${salt}`)
  let hash = crypto(
    `${key}|${txnid}|${amount.toString()}|${"deposit"}|${fname}|${email}|||||||||||${salt}`
  ).toString();
  res.render("confirm_deposit", {
    fname,
    lname,
    txnid,
    hash,
    email,
    phone,
    amount,
    key,
  });
});
router.get("/signout", (req, res) => {
  res.clearCookie("jwt");
  res.redirect("/");
});

router.get("/getinfo", async (req, res) => {
  if (!req.cookies.jwt) {
    res.json({ code: 404, message: "You need to login first." });
  } else {
    var token = req.cookies.jwt;
    try {
      let payload = jwt.verify(token, process.env.password);
      let user = await wallet.findById({ _id: payload.id });
      let {
        fname,
        lname,
        email,
        phone,
        balance,
        investment,
        currentInvestment,
        verified,
      } = user;
      res.json({
        fname,
        lname,
        email,
        phone,
        balance,
        investment,
        currentInvestment,
        verified,
      });
    } catch (error) {
      res.json({ code: 404, message: "Some error occured" });
    }
  }
});

router.get("/walletVerify/:id", async (req, res) => {
  id = req.params.id;
  wallet
    .findOneAndUpdate({ verifyId: id }, { verified: true })
    .then((confirmation) => {
      if (confirmation) res.render("wallet_verified");
      else res.render("error_in_verification");
    })
    .catch((error) => {
      res.render("error_in_verification");
    });
});
router.post("/deposit-success", async (req, res) => {
  // console.log(req.body)
  res.render("deposit_success");
  let id = req.body.txnid.split("-")[0];
  // console.log(id)
  if (req.body.status == "success") {
    try {
      let user = await wallet.findById({ _id: id });
      let { balance } = user;
      let temp_transaction = new transactions({
        from: "Bank Deposit Success",
        to: id,
        amount: parseFloat(req.body.net_amount_debit),
      });
      await temp_transaction.save();
      let updated_account = await wallet.findByIdAndUpdate(
        { _id: id },
        { balance: balance + parseFloat(req.body.net_amount_debit) }
      );
    } catch (error) {
      console.log(error);
    }
    //console.log(updated_account);
  }
});
router.post("/deposit-failure", async (req, res) => {
  //console.log(req.body)
  //let id = req.body.txnid.split("-")[0];
  //console.log(id)
  res.render("deposit_failure");
  let id = req.body.txnid.split("-")[0];
  // console.log(id)
  try {
    let user = await wallet.findById({ _id: id });
    let { balance } = user;
    let temp_transaction = new transactions({
      from: "Bank Deposit Failure",
      to: id,
      amount: parseFloat(req.body.net_amount_debit),
    });
    await temp_transaction.save();
    //console.log(updated_account);
  } catch (error) {
    console.log(error);
  }
});

router.get("/deposit", loginVerifier, async (req, res) => {
  let payload = jwt.verify(req.cookies.jwt, process.env.password);
  let user = await wallet.findById({ _id: payload.id });
  let { fname, lname, email, phone, balance, investment, currentInvestment } =
    user;
  let txnid = uuid;
  res.render("deposit", {
    fname,
    lname,
    email,
    phone,
    txnid,
    balance,
    investment,
    currentInvestment,
    id: user._id,
  });
});

router.get("/updateInvestments", async (req, res) => {
  let priceList = await growth.find({}).sort({ onDate: -1 }).limit(10);
  let user_list = await wallet.find({});
  for (let i = 0; i < user_list.length; i++) {
    user_list[i].currentInvestment = parseInt(
      user_list[i].currentInvestment +
        (user_list[i].investment * priceList[0].price) / 100
    );
    await user_list[i].save();
  }
  res.json({ code: 200, message: "Done" });
});

function send_verification_mail(temp_verification_id, email) {
  var transporter = nodemailer.createTransport({
    service: "gmail",
    port: 465,
    secure: true,
    auth: {
      user: process.env.email,
      pass: process.env.password,
    },
  });

  var mailOptions = {
    from: process.env.email,
    to: email,
    subject: "Verify Your Email",
    text: "Click on the button to verify your email ! ",
    //         html: ` <img src="https://user-images.githubusercontent.com/52379890/133371696-2488b42d-62fa-4210-b49f-9ebfea97fcd0.png" style="display: block; margin: auto; border-radius: 15px;"><br>
    //         <a href="http://ewallet-server.herokuapp.com/walletVerify/${temp_verification_id}" ><button style="display: block; background-color: rgb(6, 89, 104); height: 50px; border: transparent; border-radius: 10px; margin: auto; font-size: medium; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; color: white" > Click here to verify</button></a>
    // `
    html: `<!DOCTYPE html>
  <html>
  
  <head>
      <title></title>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <style type="text/css">
          @media screen {
              @font-face {
                  font-family: 'Lato';
                  font-style: normal;
                  font-weight: 400;
                  src: local('Lato Regular'), local('Lato-Regular'), url(https://fonts.gstatic.com/s/lato/v11/qIIYRU-oROkIk8vfvxw6QvesZW2xOQ-xsNqO47m55DA.woff) format('woff');
              }
  
              @font-face {
                  font-family: 'Lato';
                  font-style: normal;
                  font-weight: 700;
                  src: local('Lato Bold'), local('Lato-Bold'), url(https://fonts.gstatic.com/s/lato/v11/qdgUG4U09HnJwhYI-uK18wLUuEpTyoUstqEm5AMlJo4.woff) format('woff');
              }
  
              @font-face {
                  font-family: 'Lato';
                  font-style: italic;
                  font-weight: 400;
                  src: local('Lato Italic'), local('Lato-Italic'), url(https://fonts.gstatic.com/s/lato/v11/RYyZNoeFgb0l7W3Vu1aSWOvvDin1pK8aKteLpeZ5c0A.woff) format('woff');
              }
  
              @font-face {
                  font-family: 'Lato';
                  font-style: italic;
                  font-weight: 700;
                  src: local('Lato Bold Italic'), local('Lato-BoldItalic'), url(https://fonts.gstatic.com/s/lato/v11/HkF_qI1x_noxlxhrhMQYELO3LdcAZYWl9Si6vvxL-qU.woff) format('woff');
              }
          }
  
          /* CLIENT-SPECIFIC STYLES */
          body,
          table,
          td,
          a {
              -webkit-text-size-adjust: 100%;
              -ms-text-size-adjust: 100%;
          }
  
          table,
          td {
              mso-table-lspace: 0pt;
              mso-table-rspace: 0pt;
          }
  
          img {
              -ms-interpolation-mode: bicubic;
          }
  
          /* RESET STYLES */
          img {
              border: 0;
              height: auto;
              line-height: 100%;
              outline: none;
              text-decoration: none;
          }
  
          table {
              border-collapse: collapse !important;
          }
  
          body {
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
          }
  
          /* iOS BLUE LINKS */
          a[x-apple-data-detectors] {
              color: inherit !important;
              text-decoration: none !important;
              font-size: inherit !important;
              font-family: inherit !important;
              font-weight: inherit !important;
              line-height: inherit !important;
          }
  
          /* MOBILE STYLES */
          @media screen and (max-width:600px) {
              h1 {
                  font-size: 32px !important;
                  line-height: 32px !important;
              }
          }
  
          /* ANDROID CENTER FIX */
          div[style*="margin: 16px 0;"] {
              margin: 0 !important;
          }
      </style>
  </head>
  
  <body style="background-color: #f4f4f4; margin: 0 !important; padding: 0 !important;">
      <!-- HIDDEN PREHEADER TEXT -->
      <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: 'Lato', Helvetica, Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;"> We're thrilled to have you here! Get ready to dive into your new account. </div>
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <!-- LOGO -->
          <tr>
              <td bgcolor="#FFA73B" align="center">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                      <tr>
                          <td align="center" valign="top" style="padding: 40px 10px 40px 10px;"> </td>
                      </tr>
                  </table>
              </td>
          </tr>
          <tr>
              <td bgcolor="#FFA73B" align="center" style="padding: 0px 10px 0px 10px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                      <tr>
                          <td bgcolor="#ffffff" align="center" valign="top" style="padding: 40px 20px 20px 20px; border-radius: 4px 4px 0px 0px; color: #111111; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 48px; font-weight: 400; letter-spacing: 4px; line-height: 48px;">
                            <a href="#" ><img src="https://user-images.githubusercontent.com/52379890/133371696-2488b42d-62fa-4210-b49f-9ebfea97fcd0.png"  style="display: block; border: 0px; border-radius: 20px;" /></a> <h1 style="font-size: 48px; font-weight: 400; margin: 2;">Welcome!</h1> 
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
          <tr>
              <td bgcolor="#f4f4f4" align="center" style="padding: 0px 10px 0px 10px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                      <tr>
                          <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                              <p style="margin: 0;">We're excited to have you get started. First, you need to verify your email.</p>
                          </td>
                      </tr>
                      <tr>
                          <td bgcolor="#ffffff" align="left">
                              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                      <td bgcolor="#ffffff" align="center" style="padding: 20px 30px 60px 30px;">
                                          <table border="0" cellspacing="0" cellpadding="0">
                                              <tr>
                                                  <td align="center" style="border-radius: 3px;" bgcolor="#FFA73B"><a href="https://epotli-wallet.herokuapp.com/walletVerify/${temp_verification_id}" target="_blank" style="font-size: 20px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; color: #ffffff; text-decoration: none; padding: 15px 25px; border-radius: 2px; border: 1px solid #FFA73B; display: inline-block;">Click here to Verify</a></td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr> <!-- COPY -->
                      <tr>
                          
                      </tr> <!-- COPY -->
                      <tr>
                          <td bgcolor="#ffffff" align="left" style="padding: 0px 30px 20px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                              <p style="margin: 0;">If you have any questions, just reply to this email—we're always happy to help out.</p>
                          </td>
                      </tr>
                      <tr>
                          <td bgcolor="#ffffff" align="left" style="padding: 0px 30px 40px 30px; border-radius: 0px 0px 4px 4px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                              <p style="margin: 0;">Cheers,<br>E-Potli Team</p>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
          <tr>
              <td bgcolor="#f4f4f4" align="center" style="padding: 30px 10px 0px 10px;">
              </td>
          </tr>
         
      </table>
  </body>
  
  </html>`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      // console.log('Verification email sent: ' + info.response);
    }
  });
}

router.get("/test", async (req, res) => {
  //  Transaction.transfer( '6146fd46286ac4de6172a492','6146d87580ba34b052b389cf', 2000)
  //         res.json({message: 'done'})

  res.render("deposit_failure.ejs");
});

router.get("/invest", loginVerifier, (req, res) => {
  res.render("invest");
});

router.post("/invest", loginVerifier, async (req, res) => {
  let payload = jwt.verify(req.cookies.jwt, process.env.password);
  let user = await wallet.findById({ _id: payload.id });
  if (user.balance >= parseFloat(req.body.amount)) {
    user.investment = user.investment + parseFloat(req.body.amount);
    user.balance = user.balance - parseFloat(req.body.amount);
    await user.save();
    res.json({ message: "Successfully Invested ! " });
  } else {
    res.json({ message: "Insufficient Balance ! " });
  }
});

router.get("/prices", async (req, res) => {
  let priceList = await growth.find({}).sort({ onDate: -1 }).limit(10);
  res.json({ priceList });
});

router.get("/transfer", loginVerifier, async (req, res) => {
  res.render("transfer");
});

router.post("/transfer", loginVerifier, async (req, res) => {
  try {
    let payload = jwt.verify(req.cookies.jwt, process.env.password);
    let sender = await wallet.findById({ _id: payload.id });

    //console.log(receiver)
    if (sender.balance >= parseFloat(req.body.amount)) {
      //console.log(sender.balance);
      try {
        sender.balance = sender.balance - parseFloat(req.body.amount);

        let temp = await sender.save();
        // console.log(temp);
        let receiver = await wallet.findById({ _id: req.body.address });
        receiver.balance = receiver.balance + parseFloat(req.body.amount);
        await receiver.save();
        let temp_trans = new transactions({
          from: sender._id,
          to: receiver._id,
          amount: parseFloat(req.body.amount),
        });
        await temp_trans.save();
        res.json({ message: "Money Transferred ! " });
      } catch (error) {
        res.json({ message: "Some Error Occured" });
      }
    } else {
      res.json({ message: "Insufficient Balance !" });
    }
  } catch (error) {
    res.json({ message: "Receiver Address Not Found !" });
  }
});

router.get("/withdrawl", loginVerifier, async (req, res) => {
  res.render("withdrawl");
});
router.post("/withdrawl", loginVerifier, async (req, res) => {
  let payload = jwt.verify(req.cookies.jwt, process.env.password);
  try {
    let user = await wallet.findById({ _id: payload.id });
    if (user.balance >= parseFloat(req.body.amount)) {
      let temp_withdrawl = new withdrawl({
        from: user._id,
        name: user.fname,
        email: user.email,
        amount: parseFloat(req.body.amount),
        type_withdrawl: "simple",
      });
      user.balance = user.balance - parseFloat(req.body.amount);
      await user.save();
      temp_withdrawl.save();
      let temp_transaction = new transactions({
        from: user._id,
        to: "Withdrawl",
        amount: parseFloat(req.body.amount),
      });
      await temp_transaction.save();
      res.json({ message: "Withdrawl Request Submitted ! " });
    } else {
      res.json({ message: "Insufficient Funds ! " });
    }
  } catch (error) {
    res.json({ message: "Some Error Occured ! " });
  }
});

router.get("/investmentWithdrawl", loginVerifier, async (req, res) => {
  res.render("investment_withdrawl.ejs");
});
router.post("/investmentWithdrawl", loginVerifier, async (req, res) => {
  let payload = jwt.verify(req.cookies.jwt, process.env.password);
  try {
    let user = await wallet.findById({ _id: payload.id });
    if (user.currentInvestment >= parseFloat(req.body.amount)) {
      let temp_withdrawl = new withdrawl({
        from: user._id,
        name: user.fname,
        email: user.email,
        amount: parseFloat(req.body.amount),
        type_withdrawl: "investment",
      });
      user.currentInvestment =
        user.currentInvestment - parseFloat(req.body.amount);
      await user.save();
      temp_withdrawl.save();
      let temp_transaction = new transactions({
        from: user._id,
        to: "Investment Withdrawl",
        amount: parseFloat(req.body.amount),
      });
      await temp_transaction.save();
      res.json({ message: "Withdrawl Request Submitted ! " });
    } else {
      res.json({ message: "Insufficient Funds ! " });
    }
  } catch (error) {
    res.json({ message: "Some Error Occured ! " });
  }
});

router.get("/admin/console", async (req, res) => {
  let withdrawl_requests_true = await withdrawl.find({ status: true });
  let withdrawl_requests_false = await withdrawl.find({ status: false });
  res.render("admin", { withdrawl_requests_true, withdrawl_requests_false });
});

module.exports = router;
