const express = require("express");
const cors = require("cors");
const userRoutes = require("./user/userRoutes");
const blogRoutes = require("./blogs/blogRoutes");
const followRoutes = require("./follow/followRoutes");
const dbRoutes = require("./clearDb");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

const port = 8000;

app.use("/user", userRoutes);
app.use("/blog", blogRoutes);
app.use("/follow", followRoutes);
app.use("/db", dbRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
