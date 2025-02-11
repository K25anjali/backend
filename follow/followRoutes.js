const expres = require("express");
const db = require("../db");
const { validateUserLogin } = require("../utils/utils");

const router = expres.Router();

// Checking follow status
router.post("/status", async (req, res) => {
  const { uuid, followingUserName } = req.body;

  try {
    // Validate user login
    const user = await validateUserLogin(uuid);
    if (!user) {
      return res.status(401).json({ error: "Invalid Login" });
    }

    if (user.userName === followingUserName) {
      return res.status(200).json({ status: "Self" });
    }

    // SQL query to check if follow exists
    const sql =
      "SELECT * FROM follow WHERE followerUserName = ? AND followingUserName = ? AND deleted = false";
    const [users] = await db
      .promise()
      .query(sql, [user.userName, followingUserName]);

    if (users.length === 0) {
      return res.status(200).json({ status: "Not requested" });
    }

    return res.json({ status: users[0].followStatus });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// When follow request sent
router.post("/request", async (req, res) => {
  const { uuid, followingUserName, action } = req.body;

  try {
    // Validate user login
    const user = await validateUserLogin(uuid);
    if (!user) {
      return res.status(401).json({ error: "Invalid Login" });
    }

    if (action === "request") {
      // Check if follow request already exists in the database
      const checkSql = `
        SELECT * 
        FROM follow 
        WHERE followerUserName = ? 
          AND followingUserName = ? 
          AND deleted = false
      `;
      const [existingRequest] = await db
        .promise()
        .query(checkSql, [user.userName, followingUserName]);

      if (existingRequest.length > 0) {
        return res.status(400).json({ error: "Follow request already sent" });
      }
      // Insert a new follow request

      const sql =
        "INSERT INTO follow (followerUserName, followingUserName, followStatus, createdAt, deleted) VALUES (?, ?, ?, ?, ?)";
      await db
        .promise()
        .query(sql, [
          user.userName,
          followingUserName,
          "pending",
          Date.now(),
          false,
        ]);

      return res.json({ message: "Follow request sent successfully" });
    } else if (action === "revert") {
      // Check if follow request exists
      const sql =
        "SELECT * FROM follow WHERE followerUserName = ? AND followingUserName = ? AND deleted = false";
      const [users] = await db
        .promise()
        .query(sql, [user.userName, followingUserName]);

      if (users.length === 0) {
        return res.status(400).json({ error: "Not requested" });
      }

      const followStatus = users[0].followStatus;

      if (followStatus === "pending") {
        const updateSql =
          "UPDATE follow SET deleted = true WHERE followerUserName = ? AND followingUserName = ? AND deleted = false";
        await db.promise().query(updateSql, [user.userName, followingUserName]);

        return res.json({ message: "Follow request reverted successfully" });
      } else if (followStatus === "rejected") {
        return res.json({ message: "Follow request already rejected" });
      } else if (followStatus === "accepted") {
        return res.json({ message: "Follow request already accepted" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// When follow request accepted or rejected
router.post("/action", async (req, res) => {
  const { uuid, followerUserName, action } = req.body;

  if (action !== "accept" && action !== "reject") {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    // Validate user login
    const user = await validateUserLogin(uuid);
    if (!user) {
      return res.status(401).json({ error: "Invalid Login" });
    }

    // SQL query to check if follow exists
    const sql =
      "SELECT * FROM follow WHERE followerUserName = ? AND followingUserName = ? AND deleted = false";
    const [users] = await db
      .promise()
      .query(sql, [followerUserName, user.userName]);

    if (users.length === 0) {
      return res.status(400).json({ error: "Not requested" });
    }

    const followStatus = users[0].followStatus;

    let state = "";
    if (action === "accept") state = "accepted";
    else if (action === "reject") state = "rejected";

    if (followStatus === "pending") {
      const updateSql =
        "UPDATE follow SET followStatus = ?, createdAt = ? WHERE followerUserName = ? AND followingUserName = ? AND deleted = false";
      await db
        .promise()
        .query(updateSql, [
          state,
          Date.now(),
          followerUserName,
          user.userName,
        ]);

      return res.json({ message: `Follow request ${state} successfully` });
    } else if (followStatus === "rejected") {
      return res.json({ message: "Follow request already rejected" });
    } else if (followStatus === "accepted") {
      return res.json({ message: "Follow request already accepted" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// All follow requests and all followers
router.post("/all", async (req, res) => {
  const { uuid, userName, action } = req.body;

  if (!["accepted", "pending", "requestSent"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    // Validate user login
    const user = await validateUserLogin(uuid);
    if (!user) {
      return res.status(401).json({ error: "Invalid Login" });
    }

    let sql;
    if (action === "requestSent") {
      sql =
        "SELECT * FROM follow WHERE followerUserName = ? AND followStatus = ? AND deleted = false";
      const [follow] = await db
        .promise()
        .query(sql, [user.userName, "pending"]);
      return res.status(200).json({ follow });
    }
     else {
      sql =
        "SELECT * FROM follow WHERE followingUserName = ? AND followStatus = ? AND deleted = false";
      const [follow] = await db.promise().query(sql, [userName, action]);
      return res.status(200).json({ follow });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
