const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
	createJti,
	signAccessToken,
	signRefreshToken,
	persistRefreshToken,
	setRefreshCookie,
	rotateRefreshToken
} = require('../common/middlewares/tokens');

const sequelize = require('../common/database');
const defineUser = require('../common/models/User');
const User = defineUser(sequelize);

const defineRefreshToken = require('../common/models/RefreshToken');
const RefreshToken = defineRefreshToken(sequelize);

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

		const payload = { username: user.username, email: user.email };
		const accessToken = signAccessToken(payload);

		const jti = createJti();
		const refreshToken = signRefreshToken(user, jti);

		await persistRefreshToken({
			user,
			refreshToken,
			jti,
			ip: req.ip,
			userAgent: req.headers['user-agent'] || ''
		});

		setRefreshCookie(res, refreshToken);

		res.status(201).json({
			success: true,
			data: {
				message: "Succesful sign up"
			},
			token: accessToken
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, data: { message: 'Server error' } });
	}
};

exports.login = async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findByPk(email);
		if (!user) return res.status(400).json({ message: 'Invalid credentials' });

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

		const payload = { username: user.username, email: user.email };
		const accessToken = generateAccessToken(payload);

		res.status(200).json({
			success: true,
			data: { token: accessToken }
		});

	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, data: { message: 'Server error' } });
	}

}

exports.logout = async (req, res) => { }

exports.refresh = async (req, res) => {
	try {
		const token = req.cookies?.refresh_token;
		if (!token) return res.status(401).json({ message: 'No refresh token' });

		let decoded;
		try {
			decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
		} catch (err) {
			return res.status(401).json({ message: 'Invalid or expired refresh token' });
		}

		const tokenHash = hashToken(token);
		const doc = await RefreshToken.findOne({ tokenHash, jti: decoded.jti }).populate('user');

		if (!doc) {
			return res.status(401).json({ message: 'Refresh token not recognized' });
		}
		if (doc.revokedAt) {
			return res.status(401).json({ message: 'Refresh token revoked' });
		}
		if (doc.expiresAt < new Date()) {
			return res.status(401).json({ message: 'Refresh token expired' });
		}

		const result = await rotateRefreshToken(doc, doc.user, req, res);
		return res.json({ accessToken: result.accessToken });
	} catch (err) {
		res.status(500).json({ message: 'Server error' });
	}
}