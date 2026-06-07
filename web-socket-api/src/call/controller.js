const sequelize = require('../common/database');
const defineCall = require('../common/models/Call');
const Call = defineCall(sequelize);


const Ajv = require('ajv');
const addFormats = require("ajv-formats");
const { createWebSocketsServer } = require('./utils/ws-server');
const { activeSessions } = require('./utils/session-store');
const ajv = new Ajv();
addFormats(ajv);

const joinCallParamsSchema = {
	type: 'object',
	required: ['callID'],
	properties: {
		callID: { type: 'string', format: 'uuid' }
	}
};




const validateJoinCallParams = ajv.compile(joinCallParamsSchema);

exports.createCall = async (req, res) => {

	try {

		const email = req.user.email;

		const wsServerInfo = { callID: "", uri: "" };

		// Handling creating new websockets server for call
		try {
			const { callID, uri } = await createWebSocketsServer();
			console.log(callID, uri);
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
			participants: [email],
			pendingParticipants: []
		}

		// create call ID and store alongside created websockets server URL in memory
		activeSessions.set(callID, callConfig);
		console.log("activeSessions:", activeSessions);

		res.status(201).json({ success: true, data: { callID: callID, callURL: uri } });


	} catch (err) {
		console.error("This is th err:", err);
		res.status(500).json({ success: false, data: { error: 'Server error' } });
	}

};

exports.joinCall = async (req, res) => {

	try {

		// validate request params
		if (!validateJoinCallParams(req.params)) {
			return res.status(400).json({ success: false, data: { error: 'No Call ID passed', details: validateJoinCallParams.errors } });
		}

		// check if call id exists
		const retrievedCallConfig = await activeSessions.get(req.params.callID);
		if (!retrievedCallConfig) {
			return res.status(404).json({ success: false, data: { error: 'Call ID not present' } });
		}

		// add pending participant (has to join WebSocket server) to in-memory config for current call
		const email = req.user.email;


		const pendingParticipants = retrievedCallConfig.pendingParticipants;
		pendingParticipants.push(email);

		// retrieving the URL of the web socket server
		const retrievedCallURL = retrievedCallConfig.wsURL;


		console.log("activeSessions:", activeSessions);

		return res.status(201).json({ success: true, data: { callURL: retrievedCallURL } });


	} catch (err) {
		res.status(500).json({ success: false, data: { error: 'Server error' } });
	}


};

exports.leaveCall = async (req, res) => {

	try {

	} catch (err) {

	}
};

exports.sendMessage = async (req, res) => {

}