const express = require("express");
const db = require("./db");
const router = express.Router();

router.get("/clear", (req, res) => {
  db.query("DROP TABLE user", (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  db.query("DROP TABLE blog", (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  db.query("DROP TABLE follow", (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
  });
  res.json("user, blog and follow table dropped successfully.");
});

router.get("/clear/:table", (req, res) => {
  const { table } = req.params;
  db.query(`DROP TABLE ${table}`, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  res.json(`${table} table dropped successfully.`);
});

module.exports = router;
