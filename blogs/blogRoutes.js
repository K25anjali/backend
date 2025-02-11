const express = require("express");
const db = require("../db");
const { validateUserLogin } = require("../utils/utils");

const router = express.Router();

// Create new blog
router.post("/new", async (req, res) => {
	const { uuid, blogTitle, blogBody, category } = req.body;

	try {
		// Validate user login
		const user = await validateUserLogin(uuid);
		if (!user) {
			return res.status(401).json({ error: "Invalid Login" });
		}

		const newBlogSql =
			"INSERT INTO blog (author, name, blogBody, blogTitle, createdAt, category) VALUES (?, ?, ?, ?, ?, ?)";
		const createdAt = Date.now();
		const params = [
			user.userName,
			user.name,
			blogBody,
			blogTitle,
			createdAt,
			category,
		];

		const [result] = await db.promise().query(newBlogSql, params);

		res.json({
			message: "New blog created successfully",
			blog: {
				id: result.insertId,
				author: user.userName,
				name: user.name,
				blogTitle,
				blogBody,
				createdAt,
				category,
			},
		});
	} catch (err) {
		console.error(err);
		return res.status(400).json({ error: err.message });
	}
});

// Get all blogs
router.get("/all", async (req, res) => {
	const sql = "SELECT * FROM blog ORDER BY createdAt ASC";

	try {
		const [blogs] = await db.promise().query(sql);
		res.json({ blogs });
	} catch (err) {
		console.error(err);
		return res.status(400).json({ error: err.message });
	}
});

// Get blogs with limit
router.post("/limited/all", async (req, res) => {
	const LIMIT = parseInt(req.query.LIMIT);
	const OFFSET = parseInt(req.query.OFFSET) || 0;

	const sql = `SELECT * FROM blog ORDER BY createdAt ASC LIMIT ${
		LIMIT + 1
	} OFFSET ${OFFSET}`;

	try {
		const [blogs] = await db.promise().query(sql);

		if (blogs.length > LIMIT) {
			blogs.pop();
			return res.json({ blogs, hasNext: true });
		} else {
			return res.json({ blogs, hasNext: false });
		}
	} catch (err) {
		console.error(err);
		return res.status(400).json({ error: err.message });
	}
});

// Get blogs by userName
router.post("/limited", async (req, res) => {
	const LIMIT = parseInt(req.query.LIMIT);
	const OFFSET = parseInt(req.query.OFFSET) || 0;

	const { uuid, userName } = req.body;

	try {
		// Validate user login
		const user = await validateUserLogin(uuid);
		if (!user) {
			return res.status(401).json({ error: "Invalid Login" });
		}

		const sql = `SELECT * FROM blog WHERE author = ? ORDER BY createdAt ASC LIMIT ${
			LIMIT + 1
		} OFFSET ${OFFSET}`;
		const [blogs] = await db.promise().query(sql, [userName]);

		if (blogs.length > LIMIT) {
			blogs.pop();
			return res.json({ blogs, hasNext: true });
		} else {
			return res.json({ blogs, hasNext: false });
		}
	} catch (err) {
		console.error(err);
		return res.status(400).json({ error: err.message });
	}
});

// Update blog
router.post("/update", async (req, res) => {
	const { uuid, blogBody, blogTitle, category, blogId } = req.body;

	try {
		// Validate user login
		const user = await validateUserLogin(uuid);
		if (!user) {
			return res.status(401).json({ error: "Invalid Login" });
		}

		const sql =
			"UPDATE blog SET blogBody = ?, blogTitle = ?, category = ? WHERE id = ?";
		await db.promise().query(sql, [blogBody, blogTitle, category, blogId]);

		const getBlogSql = "SELECT * FROM blog WHERE id = ?";
		const [blogs] = await db.promise().query(getBlogSql, [blogId]);

		if (blogs.length === 0) {
			return res.status(404).json({ error: "Blog not found" });
		}

		const updatedBlog = blogs[0];

		res.json({
			message: "Blog updated successfully",
			updatedBlog: updatedBlog,
		});
	} catch (err) {
		console.error(err);
		return res.status(400).json({ error: err.message });
	}
});

router.post("/delete", async (req, res) => {
	const { uuid, id } = req.body;

	try {
		// Validate user login
		const user = await validateUserLogin(uuid);
		if (!user) {
			return res.status(401).json({ error: "Invalid Login" });
		}

		const sql = "DELETE FROM blog WHERE id = ? ";
		const [result] = await db.promise().query(sql, [id]);

		if (result.affectedRows === 0) {
			return res.status(404).json({ error: "Blog not found or unauthorized" });
		}

		res.json({ message: "Blog deleted successfully" });
	} catch (err) {
		console.error(err);
		return res.status(400).json({ error: err.message });
	}
});

module.exports = router;
