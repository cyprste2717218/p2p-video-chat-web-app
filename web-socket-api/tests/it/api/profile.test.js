import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';
import supertest from 'supertest';
import {
	app,
	User,
	decodeJwtPayload,
	resetDatabase,
	signup,
	uniqueUser,
} from './helpers.js';

beforeEach(async () => {
	await resetDatabase();
});

describe('user profile data (via signup/login — no dedicated profile endpoint exists)', () => {
	it('persists username and email exactly as submitted, and hashes the password', async () => {
		const user = uniqueUser();
		await signup(user);

		const row = await User.findByPk(user.email);
		assert.ok(row, 'expected the User row to be persisted');
		assert.equal(row.username, user.username);
		assert.equal(row.email, user.email);
		assert.notEqual(row.password, user.password);
		assert.match(row.password, /^\$2[aby]\$/v, 'expected a bcrypt hash');
	});

	it("login's access token payload reflects the persisted profile", async () => {
		const user = uniqueUser();
		await signup(user);

		const loginResponse = await supertest(app)
			.post('/auth/login')
			.send({email: user.email, password: user.password});

		const decoded = decodeJwtPayload(loginResponse.body.data.token);
		assert.equal(decoded.username, user.username);
		assert.equal(decoded.email, user.email);
	});

	it('does not create a second User row on duplicate signup', async () => {
		const user = uniqueUser();
		await signup(user);
		await signup(user);

		const count = await User.count({where: {email: user.email}});
		assert.equal(count, 1);
	});
});
