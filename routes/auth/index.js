const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

// import modules
const crudHelper = require('../../utils/crudHelper');
const dateTimeHelper = require('../../utils/dateTimeHelper');

// db setup
const DbConnection = require('../../db');

// Registration Page for Customers
router.get("/register", async (req, res) => {
	res.render('auth/register');
});

// Login Page for Customers
router.get("/login", async (req, res) => {
	res.render('auth/login');
});

// Protected page - only for Authenticated users' access
router.get("/resource", async (req, res) => {
	const dbCollection = await DbConnection.getCollection("foods");
	const foods = await dbCollection.find().toArray();

	// TODO: this page must only be seen by auth. users
	res.render('auth/resource', {
		foods: foods
	})
});

// Registration handler
router.post('/register', async (req, res) => {
	const newUser = req.body;

	const dbCollection = await DbConnection.getCollection("users");
	const user = await dbCollection.findOne({ id: newUser.id });

	if (user) {
		res.json({
			error: "User with given id already exists"
		})
	} else if (!newUser.username || !newUser.password || !newUser.confirm_password || !newUser.name) {
		res.json({
			error: "Username, Password and Name are required fields"
		})
	} else if (newUser.password !== newUser.confirm_password) {
		res.json({
			error: "Password and confirmation don't match"
		})
	} else {
		// remove confirm_password from object using ES6 rest operator
		const { confirm_password, password, ..._newUser } = newUser;

		console.log('Registering new user: ', _newUser);

		// generate password hash with salt
		const salt = await bcrypt.genSalt(10); // salt rounds
		const passwordHash = await bcrypt.hash(password, salt);

		let users = await dbCollection.find().toArray();

		await dbCollection.insertOne({
			..._newUser,
			password: passwordHash,
			id: crudHelper.getNextId(users),
			createdAt: dateTimeHelper.getTimeStamp(),
		});

		// redirect to login page
		res.redirect('login');
	}
});

// Login handler
router.post('/login', async (req, res) => {
	const userToAuth = req.body;

	if (!userToAuth.username || !userToAuth.password) {
		return res.json({
			error: "Username and password required"
		})
	}

	console.log(`Authenticating ${userToAuth.username}`)

	// find user from DB
	const dbCollection = await DbConnection.getCollection("users");
	const user = await dbCollection.findOne({
		username: userToAuth.username,
	});

	if (!user) {
		return res.json({
			error: "Login failed"
		})
	}

	// check if given password's hash matches the user password hash in the DB
	const isMatch = await bcrypt.compare(userToAuth.password, user.password);
	console.log(`Plain text: ${userToAuth.password}`)
	console.log(`Hash: ${user.password}`)
	console.log(`match: ${isMatch}`)

	if (isMatch) {
		res.json({
			message: "Login successful"
		})
	} else {
		res.json({
			message: "Login failed"
		})
	}
});

module.exports = router; 