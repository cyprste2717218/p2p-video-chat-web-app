const sequelize = require('../common/database');
const defineCall = require('../common/models/Call');
const Call = defineCall(sequelize);


const Ajv = require('ajv');
const addFormats = require("ajv-formats");
const { createWebSocketsServer } = require('./utils/ws-server');
const ajv = new Ajv();
addFormats(ajv);

const joinCallParamsSchema = {
	type: 'object',
	required: ['callId'],
	properties: {
		callId: { type: 'string', format: 'uuid' }
	}
};

const joinCallBodySchema = {
	type: 'object',
	required: ['username'],
	properties: {
		username: { type: 'string' }
	}
};

const createCallSchema = {
	type: 'object',
	required: ['username'],
	properties: {
		username: { type: 'string' }
	}
}

const validateJoinCallParams = ajv.compile(joinCallParamsSchema);
const validateJoinCallBody = ajv.compile(joinCallBodySchema);

const validateCreateCall = ajv.compile(createCallSchema)


const activeSessions = new Map();


exports.createCall = async (req, res) => {

	try {

		// validate request body

		if (!validateCreateCall(req.body)) {
			return res.status(400).json({ error: 'Invalid input', details: validateCreateCall.errors });
		}

		const { username } = req.body;

		// create new websockets server for call
		const { callId, uri } = await createWebSocketsServer();

		const callConfig = {
			wsURL: uri,
			participants: [username]
		}

		// create call ID and store alongside created websockets server URL in memory
		activeSessions.set(callId, callConfig);

		res.status(201).json({ success: true, data: { callId: callId, callURL: uri } });


	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}

};

exports.joinCall = async (req, res) => {

	try {

		// validate request params
		if (!validateJoinCallParams(req.params)) {
			return res.status(400).json({ success: false, error: 'Invalid input', details: validateJoinCallParams.errors });
		}

		// validate request body
		if (!validateJoinCallBody(req.body)) {
			return res.status(400).json({ success: false, error: 'Invalid input', details: validateJoinCallBody.errors });
		}

		// check if call id exists
		const retrievedCallConfig = await activeSessions.get(req.params.callId);
		if (!retrievedCallConfig) {
			return res.status(404).json({ success: false, error: 'Call ID not present' });
		}

		// adding new participant to in-memory config for current call
		const { username } = req.body;

		const allCallParticipants = retrievedCallConfig.participants;
		allCallParticipants.push(username);

		const otherCallParticipants = allCallParticipants.filter(participant => participant !== username);

		// retrieving the URL of the web socket server
		const retrievedCallURL = retrievedCallConfig.wsURL;

		return res.status(201).json({ success: true, data: { callURL: retrievedCallURL, otherCallParticipants: otherCallParticipants } });


	} catch (err) {
		res.status(500).json({ success: false, error: err.message, reqBody: String(req.body) });
	}


};

exports.leaveCall = async (req, res) => {

	try {

	} catch (err) {

	}
};