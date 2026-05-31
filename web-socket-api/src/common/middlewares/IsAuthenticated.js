const jwt = require('jsonwebtoken');

exports.check = (req, res, next) => {
	const authHeader = req.headers['authorization'];
	if (!authHeader)
		return res.status(401).json({ error: 'No authorization header provided' });

	const [type, tokenFromHeader] = authHeader.split(' ');
	const tokenFromCookie = req.cookies?.access_token;

	const token = type === 'Bearer' && tokenFromHeader ? tokenFromHeader : tokenFromCookie;

	if (!token)
		return res.status(401).json({ success: false, data: { message: 'No token provided' } });

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded;
		next();
	} catch (err) {
		if (err.name === 'TokenExpiredError') {
			return res.status(401).json({ message: 'Access token expired' });
		}
		return res.status(401).json({ message: 'Invalid token' });
	}
};