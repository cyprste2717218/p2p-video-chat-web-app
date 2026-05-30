const sequelize = require('../common/database');
const defineCall = require('../common/models/Call');
const Call = defineCall(sequelize);


const Ajv = require('ajv');
const addFormats = require("ajv-formats");
const { createWebSocketsServer, activeSessions } = require('./utils/ws-server');
const ajv = new Ajv();
addFormats(ajv);

const joinCallParamsSchema = {
	type: 'object',
	required: ['callID'],
	properties: {
		callID: { type: 'string', format: 'uuid' }
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


exports.createCall = async (req, res) => {

	try {

		// validate request body

		if (!validateCreateCall(req.body)) {
			return res.status(400).json({ error: 'Invalid input', details: validateCreateCall.errors });
		}

		const { username } = req.body;

		const wsServerInfo = { callID: "", uri: "" };

		// Handling creating new websockets server for call
		try {
			const { callID, uri } = await createWebSocketsServer();
			wsServerInfo.callID = callID;
			wsServerInfo.uri = uri;

		} catch (err) {
			console.error("Error during creation of WebSocket server:", err);
			throw new Error("An error occured in our systems, please try again");
		}

		// checking details present for created websockets server before storing to memory
		if (!(wsServerInfo.callID || wsServerInfo.uri)) {
			console.error("No value stored for callID or uri fields in wsServerInfo");
			throw new Error("An error occured in our systems, please try again")
		}

		const uri = wsServerInfo.uri;
		const callID = wsServerInfo.callID;

		const callConfig = {
			wsURL: uri,
			participants: [username],
			pendingParticipants: []
		}

		// create call ID and store alongside created websockets server URL in memory
		activeSessions.set(callID, callConfig);

		res.status(201).json({ success: true, data: { callID: callID, callURL: uri } });


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
		const retrievedCallConfig = await activeSessions.get(req.params.callID);
		if (!retrievedCallConfig) {
			return res.status(404).json({ success: false, error: 'Call ID not present' });
		}

		// add pending participant (has to join WebSocket server) to in-memory config for current call
		const { username } = req.body;


		const pendingParticipants = retrievedCallConfig.pendingParticipants;
		pendingParticipants.push(username);

		// retrieving the URL of the web socket server
		const retrievedCallURL = retrievedCallConfig.wsURL;

		return res.status(201).json({ success: true, data: { callURL: retrievedCallURL } });


	} catch (err) {
		res.status(500).json({ success: false, error: err.message, reqBody: String(req.body) });
	}


};

exports.leaveCall = async (req, res) => {

	try {

	} catch (err) {

	}
};

exports.sendMessage = async (req, res) => {

}