const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sequelize = require('../common/database');
const defineUser = require('../common/models/User');
const User = defineUser(sequelize);

const Ajv = require('ajv');
const addFormats = require("ajv-formats")
const ajv = new Ajv();
addFormats(ajv);

const schema = {
	type: 'object',
	required: ['username', 'email', 'password'],
	properties: {
		username: { type: 'string', minLength: 3 },
		email: { type: 'string', format: 'email' },
		password: { type: 'string', minLength: 6 }
	}
};

const validate = ajv.compile(schema);

const hashPassword = (password) =>
	bcrypt.hash(password, 10);

const generateAccessToken = (username, userId) =>
	jwt.sign({ username, userId }, 'your-secret-key', { expiresIn: '72h' });

exports.register = async (req, res) => {
	try {
		if (!validate(req.body)) {
			return res.status(400).json({ error: 'Invalid input', details: validate.errors });
		}
		const { username, email, password } = req.body;
		const hashedPassword = hashPassword(password);
		const user = await User.create({
			username,
			email,
			password: hashedPassword
		});
		const accessToken = generateAccessToken(username, user.id);

		res.status(201).json({
			success: true,
			user: { id: user.id, username: user.username, email: user.email },
			token: accessToken
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message, reqBody: String(req.body) });
	}
};

exports.login = async (req, res) => {


}

exports.logout = async (req, res) => { }