import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';
import supertest from 'supertest';
import {
	app,
	Call,
	CallParticipants,
	resetDatabase,
	signupAndLogin,
} from './helpers.js';

beforeEach(async () => {
	await resetDatabase();
});

describe('POST /call/create', () => {
	it('creates a call and persists a Call row plus a pending CallParticipants row', async () => {
		const {accessToken, email} = await signupAndLogin();

		const response = await supertest(app)
			.post('/call/create')
			.set('Authorization', `Bearer ${accessToken}`);

		assert.equal(response.status, 201);
		assert.equal(response.body.success, true);
		assert.match(
			response.body.data.callID,
			/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/iv,
		);
		assert.equal(typeof response.body.data.callURL, 'string');

		const callRow = await Call.findByPk(response.body.data.callID);
		assert.ok(callRow, 'expected the Call row to be persisted');

		const participantRow = await CallParticipants.findOne({
			where: {callCallID: response.body.data.callID, userEmail: email},
		});
		assert.ok(
			participantRow,
			'expected a CallParticipants row for the creator',
		);
		assert.equal(participantRow.status, 'pending');
	});

	it('returns 401 without an access token', async () => {
		const response = await supertest(app).post('/call/create');
		assert.equal(response.status, 401);
	});
});

describe('PUT /call/:callID/join', () => {
	it('joins an existing open call', async () => {
		const creator = await signupAndLogin();
		const createResponse = await supertest(app)
			.post('/call/create')
			.set('Authorization', `Bearer ${creator.accessToken}`);
		const {callID} = createResponse.body.data;

		const joiner = await signupAndLogin();
		const response = await supertest(app)
			.put(`/call/${callID}/join`)
			.set('Authorization', `Bearer ${joiner.accessToken}`);

		assert.equal(response.status, 201);
		assert.equal(response.body.success, true);
		assert.equal(response.body.data.callURL, createResponse.body.data.callURL);

		const participantRow = await CallParticipants.findOne({
			where: {callCallID: callID, userEmail: joiner.email},
		});
		assert.ok(participantRow, 'expected a CallParticipants row for the joiner');
	});

	it('returns 400 for a malformed callID', async () => {
		const {accessToken} = await signupAndLogin();

		const response = await supertest(app)
			.put('/call/not-a-uuid/join')
			.set('Authorization', `Bearer ${accessToken}`);

		assert.equal(response.status, 400);
		assert.equal(response.body.data.error, 'No Call ID passed');
	});

	it('returns 404 for a call that does not exist', async () => {
		const {accessToken} = await signupAndLogin();

		const response = await supertest(app)
			.put('/call/00000000-0000-0000-0000-000000000000/join')
			.set('Authorization', `Bearer ${accessToken}`);

		assert.equal(response.status, 404);
		assert.equal(response.body.data.error, 'Call ID not present');
	});

	it('returns 400 for a call that has already finished', async () => {
		const creator = await signupAndLogin();
		const createResponse = await supertest(app)
			.post('/call/create')
			.set('Authorization', `Bearer ${creator.accessToken}`);
		const {callID} = createResponse.body.data;

		await Call.update({finishedAt: new Date()}, {where: {callID}});

		const joiner = await signupAndLogin();
		const response = await supertest(app)
			.put(`/call/${callID}/join`)
			.set('Authorization', `Bearer ${joiner.accessToken}`);

		assert.equal(response.status, 400);
		assert.equal(response.body.data.error, 'Call has ended');
	});
});

describe('DELETE /call/:callID/leave', () => {
	// ActiveCall defaults to false at creation and is never set true anywhere
	// in the codebase (see CLAUDE.md "Incomplete endpoints"), so the 200
	// happy path is currently unreachable via the HTTP API. These tests
	// assert that documented, current behaviour rather than "fix" it.
	it('returns 400 "Call is not active" for a freshly created call', async () => {
		const {accessToken} = await signupAndLogin();
		const createResponse = await supertest(app)
			.post('/call/create')
			.set('Authorization', `Bearer ${accessToken}`);
		const {callID} = createResponse.body.data;

		const response = await supertest(app)
			.delete(`/call/${callID}/leave`)
			.set('Authorization', `Bearer ${accessToken}`);

		assert.equal(response.status, 400);
		assert.equal(response.body.data.error, 'Call is not active');
	});

	it('returns 404 for a call that does not exist', async () => {
		const {accessToken} = await signupAndLogin();

		const response = await supertest(app)
			.delete('/call/00000000-0000-0000-0000-000000000000/leave')
			.set('Authorization', `Bearer ${accessToken}`);

		assert.equal(response.status, 404);
	});

	it('returns 400 for a malformed callID', async () => {
		const {accessToken} = await signupAndLogin();

		const response = await supertest(app)
			.delete('/call/not-a-uuid/leave')
			.set('Authorization', `Bearer ${accessToken}`);

		assert.equal(response.status, 400);
	});
});

describe('POST /call/:callID/messages', () => {
	it('returns 501 Not Implemented', async () => {
		const {accessToken} = await signupAndLogin();
		const createResponse = await supertest(app)
			.post('/call/create')
			.set('Authorization', `Bearer ${accessToken}`);
		const {callID} = createResponse.body.data;

		const response = await supertest(app)
			.post(`/call/${callID}/messages`)
			.set('Authorization', `Bearer ${accessToken}`);

		assert.equal(response.status, 501);
	});

	it('returns 401 without an access token', async () => {
		const response = await supertest(app).post(
			'/call/00000000-0000-0000-0000-000000000000/messages',
		);
		assert.equal(response.status, 401);
	});
});
