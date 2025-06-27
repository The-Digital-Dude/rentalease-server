require("dotenv").config();
const express = require("express");
const app = express();
const connectDB = require("./db");

const PORT = process.env.PORT;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

app.get("/", (req, res) => {
  res.send("Hello from Express with dotenv!");
});
