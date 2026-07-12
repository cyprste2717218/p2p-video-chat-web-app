import process from 'node:process';
import jwt from 'jsonwebtoken';

export function check(request, response, next) {
	const authHeader = request.headers.authorization;
	if (!authHeader)
		return response
			.status(401)
			.json({error: 'No authorization header provided'});

	const [type, tokenFromHeader] = authHeader.split(' ');
	const tokenFromCookie = request.cookies?.access_token;

	const token =
		type === 'Bearer' && tokenFromHeader ? tokenFromHeader : tokenFromCookie;

	if (!token)
		return response
			.status(401)
			.json({success: false, data: {message: 'No token provided'}});

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		request.user = decoded;
		next();
	} catch (error) {
		if (error.name === 'TokenExpiredError') {
			return response.status(401).json({message: 'Access token expired'});
		}

		return response.status(401).json({message: 'Invalid token'});
	}
}
