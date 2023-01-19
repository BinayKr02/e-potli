const express = require("express");
const app = express();
const dotenv = require("dotenv");
const routes = require("./routes.js");
dotenv.config({ path: "./config.env" });
const PORT = process.env.PORT || 3000;
const mongoose = require("mongoose");

//Database Connection
mongoose
  .connect(process.env.dbURL)
  .then(function () {
    console.log("Connected with Database");
  })
  .catch(function (error) {
    console.log("Error in connection with Database: " + error);
  });

//Middlewares
app.set("view engine", "ejs");
app.use(routes);
app.use(express.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});
app.use(express.static(__dirname + "/public"));

app.listen(PORT, (error) => {
  if (error) {
    console.log("Error on listening: " + error);
  } else {
    console.log("Server Application listening on port: " + PORT);
  }
});
