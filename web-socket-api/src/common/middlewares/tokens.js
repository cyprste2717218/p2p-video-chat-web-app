import crypto from 'node:crypto';
import process from 'node:process';
import jwt from 'jsonwebtoken';
import {RefreshToken} from '../models/index.js';

const ACCESS_TTL = '15m';
const REFRESH_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function hashToken(token) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

function createJti() {
	return crypto.randomBytes(16).toString('hex');
}

function signAccessToken(user) {
	const payload = {username: user.username, email: user.email};
	return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: ACCESS_TTL});
}

function signRefreshToken(user, jti) {
	const payload = {email: user.email, jti};
	const token = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: REFRESH_TTL_SEC,
	});
	return token;
}

async function persistRefreshToken({user, refreshToken, jti, ip, userAgent}) {
	const tokenHash = hashToken(refreshToken);
	const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000);
	await RefreshToken.create({
		userEmail: user.email,
		tokenHash,
		jti,
		expiresAt,
		ip,
		userAgent,
	});
}

function setRefreshCookie(response, refreshToken) {
	const isProd = process.env.NODE_ENV === 'production';
	response.cookie('refresh_token', refreshToken, {
		httpOnly: true,
		secure: isProd,
		sameSite: 'strict',
		// Scoped to /auth so the cookie is actually sent to both endpoints
		// that need it: /auth/logout and /auth/refresh (a Path of '/refresh'
		// matches neither, since cookie Path is a literal path-segment
		// prefix, not a suffix/route-name match).
		path: '/auth',
		maxAge: REFRESH_TTL_SEC * 1000,
	});
}

async function rotateRefreshToken(oldDoc, user, request, response) {
	// Revoke old
	oldDoc.revokedAt = new Date();
	const newJti = createJti();
	oldDoc.replacedBy = newJti;
	await oldDoc.save();

	// Issue new
	const newAccess = signAccessToken(user);
	const newRefresh = signRefreshToken(user, newJti);
	await persistRefreshToken({
		user,
		refreshToken: newRefresh,
		jti: newJti,
		ip: request.ip,
		userAgent: request.headers['user-agent'] || '',
	});
	setRefreshCookie(response, newRefresh);
	return {accessToken: newAccess};
}

export {
	hashToken,
	createJti,
	signAccessToken,
	signRefreshToken,
	persistRefreshToken,
	setRefreshCookie,
	rotateRefreshToken,
};
