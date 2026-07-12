import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';
import supertest from 'supertest';
import {
	app,
	Call,
	CallParticipants,
	RefreshToken,
	resetDatabase,
	signupAndLogin,
} from './helpers.js';

beforeEach(async () => {
	await resetDatabase();
});

describe('database persistence', () => {
	it('Call and CallParticipants rows survive across independent HTTP requests', async () => {
		const creator = await signupAndLogin();
		const createResponse = await supertest(app)
			.post('/call/create')
			.set('Authorization', `Bearer ${creator.accessToken}`);
		const {callID} = createResponse.body.data;

		// Separate request/connection entirely from the one that created the call.
		const joiner = await signupAndLogin();
		const joinResponse = await supertest(app)
			.put(`/call/${callID}/join`)
			.set('Authorization', `Bearer ${joiner.accessToken}`);

		assert.equal(joinResponse.status, 201);

		const callRow = await Call.findByPk(callID);
		assert.ok(callRow, 'expected the Call row to persist across requests');

		const participantCount = await CallParticipants.count({
			where: {callCallID: callID},
		});
		assert.equal(participantCount, 2, 'expected both creator and joiner rows');
	});

	it('login creates exactly one un-revoked RefreshToken row', async () => {
		const {email} = await signupAndLogin();

		const rows = await RefreshToken.findAll({where: {userEmail: email}});
		assert.equal(rows.length, 1);
		assert.equal(rows[0].revokedAt, null);
	});

	it('logout revokes the RefreshToken row without creating a new one', async () => {
		const {agent, accessToken, email} = await signupAndLogin();

		await agent
			.post('/auth/logout')
			.set('Authorization', `Bearer ${accessToken}`);

		const rows = await RefreshToken.findAll({where: {userEmail: email}});
		assert.equal(rows.length, 1);
		assert.ok(rows[0].revokedAt);
	});

	it('refresh revokes the old row and persists a new one', async () => {
		const {agent, accessToken, email} = await signupAndLogin();

		await agent
			.post('/auth/refresh')
			.set('Authorization', `Bearer ${accessToken}`);

		const rows = await RefreshToken.findAll({where: {userEmail: email}});
		assert.equal(rows.length, 2);
		const revoked = rows.filter((row) => row.revokedAt);
		const active = rows.filter((row) => !row.revokedAt);
		assert.equal(revoked.length, 1);
		assert.equal(active.length, 1);
	});
});
