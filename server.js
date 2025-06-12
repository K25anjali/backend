require('dotenv').config();
const express = require("express");
const cors = require("cors");
const userRoutes = require("./user/userRoutes");
const blogRoutes = require("./blogs/blogRoutes");
const followRoutes = require("./follow/followRoutes");
const dbRoutes = require("./clearDb");
require('./db'); // DB setup

const app = express();
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"]
}));
app.use(express.json());

app.use("/user", userRoutes);
app.use("/blog", blogRoutes);
app.use("/follow", followRoutes);
app.use("/db", dbRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to Vritant");
});

const port = 8000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
