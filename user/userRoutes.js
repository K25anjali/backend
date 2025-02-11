const express = require("express");
const db = require("../db");
const { v4: uuidv4 } = require("uuid");
const { validateUserLogin } = require("../utils/utils");

const router = express.Router();

// User registration
router.post("/registration", (req, res) => {
	const { userName, name, email, password } = req.body;
	console.log("Request received at /registration");

	//validate userName and email
	const checkSql =
		"SELECT * FROM user WHERE (userName = ? OR email = ?) AND deleted = false"; //AND deleted=false

	db.query(checkSql, [userName, email], (err, users) => {
		if (err) {
			return res.status(400).json({ error: err.message });
		}

		// Check if any users were returned
		if (users.length > 0) {
			const user = users[0];

			// Check if the userName or email already exists
			if (userName === user.userName) {
				return res.status(400).json({ error: "This userName already exist." });
			}

			if (email === user.email) {
				return res.status(400).json({ error: "This email already exist." });
			}
		}

		// If no duplicates, proceed with user registration
		const sql =
			"INSERT INTO user (uuid, userName, name, email, password) VALUES (?, ?, ?, ?, ?)";

		try {
			db.query(sql, [null, userName, name, email, password], (err, result) => {
				if (err) {
					return res.status(400).json({ error: err.message });
				}

				res.json({
					message: "User registered successfully",
					user: {
						id: result.insertId,
						uuid: null, //generate a UUID here
						userName: userName,
						name: name,
						email: email,
						deleted: false,
					},
				});
			});
		} catch (error) {
			res.status(500).json({ error: "Failed to register user" });
		}
	});
});

// User login
router.post("/login", (req, res) => {
	const { email, password, userName } = req.body;
	const sql =
		"SELECT * FROM user WHERE (email = ? OR userName = ?) AND deleted = false";

	db.query(sql, [email, userName], (err, users) => {
		if (err) {
			return res.status(400).json({ error: err.message });
		}

		// Check if user exists
		if (!users || users.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		const user = users[0];

		if (password === user.password) {
			const userLoginId = uuidv4();
			const lastLogin = Date.now();

			// Update UUID and lastLogin of user in database
			const updateUserSql =
				"UPDATE user SET uuid = ?, lastLogin = ? WHERE email = ?";

			db.query(updateUserSql, [userLoginId, lastLogin, user.email], (err) => {
				if (err) {
					return res.status(400).json({ error: err.message });
				}

				// Get updated user
				db.query(
					"SELECT * FROM user WHERE email = ?",
					[user.email],
					(err, users) => {
						if (err) {
							return res.status(400).json({ error: err.message });
						}

						const updatedUser = users[0];
						if (!updatedUser) {
							return res.json("User not found");
						}

						res.json({
							message: "Login successfull",
							user: {
								id: updatedUser.id,
								uuid: updatedUser.uuid,
								userName: updatedUser.userName,
								name: updatedUser.name,
								email: updatedUser.email,
								lastLogin: updatedUser.lastLogin,
								deleted: Boolean(updatedUser.deleted),
							},
						});
					},
				);
			});
		} else {
			console.log(user.password);
			res
				.status(400)
				.json({ error: "Invalid password", password: user.password });
		}
	});
});

// User logout
router.post("/logout", (req, res) => {
	const { uuid } = req.body;

	// Invalidate the UUID by setting it to NULL or a new value
	const sql = "UPDATE user SET uuid = NULL WHERE uuid = ?";

	db.query(sql, [uuid], (err, result) => {
		if (err) {
			return res
				.status(500)
				.json({ error: "Failed to logout: " + err.message });
		}

		if (result.affectedRows === 0) {
			return res
				.status(404)
				.json({ error: "Session not found or already logged out" });
		}
		console.log("Logout successful");

		res.status(200).json("Logout successful");
	});
});

// DO NOT USE
// Get all users
router.get("/all", (req, res) => {
	const sql = "SELECT * FROM user";

	db.query(sql, (err, users) => {
		if (err) {
			return res.status(400).json({ error: err.message });
		}

		console.log("All users:", users);
		res.json({ users });
	});
});

// Update user
router.post("/update", async (req, res) => {
	const { uuid, userName, name, email, password } = req.body;

	try {
		// Validate user login
		const user = await validateUserLogin(uuid);
		if (!user) {
			return res.status(401).json({ error: "Invalid Login" });
		}

		// SQL query to update user information
		const sql =
			"UPDATE user SET name = ?, email = ?, password = ? WHERE userName = ?";
		const [updateResult] = await db
			.promise()
			.query(sql, [name, email, password, userName]);

		// If no rows were affected, user may not exist
		if (updateResult.affectedRows === 0) {
			return res
				.status(404)
				.json({ error: "User not found or no changes made" });
		}

		// SQL query to get the updated user
		const getUserSql = "SELECT * FROM user WHERE userName = ?";
		const [users] = await db.promise().query(getUserSql, [userName]);

		if (users.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		const updatedUser = users[0];

		return res.status(200).json({
			message: "User updated successfully",
			updatedUser: updatedUser,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: err.message });
	}
});

// Delete User
router.post("/delete", async (req, res) => {
	const { uuid } = req.body;

	try {
		// Validate user login
		const user = await validateUserLogin(uuid);
		if (!user) {
			return res.status(401).json({ error: "Invalid Login" });
		}

		// SQL query to update user's deleted status
		const sql = "UPDATE user SET deleted = true WHERE uuid = ?";
		const [result] = await db.promise().query(sql, [uuid]);

		if (result.affectedRows === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		return res.json({ message: "User deleted successfully" });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: err.message });
	}
});

// get user by userName
router.post("/getUser", async (req, res) => {
	try {
		const { uuid, userName } = req.body;

		// Validate the user's login
		const user = await validateUserLogin(uuid);

		// Query to fetch target user
		const userSql =
			"SELECT id, userName, name FROM user WHERE userName = ? AND deleted = FALSE";
		const [userResult] = await db.promise().query(userSql, [userName]);

		if (!userResult.length) {
			return res.status(404).json({ error: "User not found" });
		}

		const targetUser = userResult[0];

		// Define queries for counts
		const followerCountSql = `
      SELECT COUNT(*) AS followerCount
      FROM follow
      WHERE followingUserName = ? AND followStatus = 'accepted' AND deleted = FALSE
    `;
		const followingCountSql = `
      SELECT COUNT(*) AS followingCount
      FROM follow
      WHERE followerUserName = ? AND followStatus = 'accepted' AND deleted = FALSE
    `;
		const followReqCountSql = `
      SELECT COUNT(*) AS followReqCount
      FROM follow
      WHERE followingUserName = ? AND followStatus = 'pending' AND deleted = FALSE
    `;
		const followSql = `
      SELECT followStatus
      FROM follow
      WHERE followerUserName = ? AND followingUserName = ? AND deleted = FALSE
    `;

		// Execute all queries in parallel
		const [
			[followerCountResult],
			[followingCountResult],
			[followReqCountResult],
			[followResult],
		] = await Promise.all([
			db.promise().query(followerCountSql, [userName]),
			db.promise().query(followingCountSql, [userName]),
			db.promise().query(followReqCountSql, [userName]),
			db.promise().query(followSql, [!user ? null : user.userName, userName]),
		]);

		// Extract results
		const followerCount = followerCountResult[0].followerCount || 0;
		const followingCount = followingCountResult[0].followingCount || 0;
		const followReqCount = followReqCountResult[0]?.followReqCount || 0;
		const followStatus = !followResult
			? null
			: followResult.length
			? followResult[0].followStatus
			: null;

		// Build response
		const response = {
			userName: targetUser.userName,
			name: targetUser.name,
			followStatus: !user
				? null
				: user.userName === userName
				? "self"
				: followStatus,
			followerCount,
			followingCount,
			followReqCount,
		};

		return res.status(200).json(response);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: error.message });
	}
});

module.exports = router;
