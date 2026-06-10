const { Call, User, CallParticipants } = require('../common/models');

const Ajv = require('ajv');
const addFormats = require("ajv-formats");
const { createWebSocketsServer, shutDownServer } = require('./utils/ws-server');
const ajv = new Ajv();
addFormats(ajv);

const callParamsSchema = {
	type: 'object',
	required: ['callID'],
	properties: {
		callID: { type: 'string', format: 'uuid' }
	}
};

const validateCallParams = ajv.compile(callParamsSchema);

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

		// Find the entry in 'users' table for user creating the call 
		const retrievedUser = await User.findByPk(email);
		if (retrievedUser === null) {
			console.error(`User with email: ${email} not found in Users table`);
			throw new Error("Error finding record for user creating call");
		}

		// Add new call details and linked user to DB
		const newCall = await Call.create({
			callID,
			callURL: uri,
			totalDurationSecs: 0,
			activeCall: false,
		});

		newCall.addUser(retrievedUser);

		res.status(201).json({ success: true, data: { callID: callID, callURL: uri } });


	} catch (err) {
		console.error("Error during call creation:", err);
		res.status(500).json({ success: false, data: { error: 'Server error' } });
	}

};

exports.joinCall = async (req, res) => {

	try {

		// validate request params
		if (!validateCallParams(req.params)) {
			return res.status(400).json({ success: false, data: { error: 'No Call ID passed', details: validateCallParams.errors } });
		}

		// check if call ID exists
		const requestedCall = await Call.findByPk(req.params.callID);
		if (!requestedCall) {
			return res.status(404).json({ success: false, data: { error: 'Call ID not present' } });
		}

		// verify call has not ended yet
		const isCallFinished = requestedCall.finishedAt;
		if (isCallFinished) {
			return res.status(400).json({ success: false, data: { error: 'Call has ended' } });
		}

		// Find the entry in 'users' table for user joining the call 
		const email = req.user.email;
		const retrievedUser = await User.findByPk(email);
		if (retrievedUser === null) {
			console.error(`User with email: ${email} not found in Users table`);
			throw new Error("Error finding record for user joining call");
		}

		// add pending participant (has to join WebSocket server) to in-memory config for current call
		requestedCall.addUser(retrievedUser)

		// retrieving the URL of the web socket server
		const requestedCallURL = requestedCall.callURL;

		return res.status(201).json({ success: true, data: { callURL: requestedCallURL } });


	} catch (err) {
		res.status(500).json({ success: false, data: { error: 'Server error' } });
	}


};

exports.leaveCall = async (req, res) => {

	try {
		// validate request params
		if (!validateCallParams(req.params)) {
			return res.status(400).json({ success: false, data: { error: 'No Call ID passed', details: validateCallParams.errors } });
		}

		const callID = req.params.callID;
		const email = req.user.email;

		// check if call ID exists
		const requestedCall = await Call.findByPk(callID);
		if (!requestedCall) {
			return res.status(404).json({ success: false, data: { error: 'Call ID not present' } });
		}

		// check if call is active
		const isCallActive = requestedCall.activeCall;
		if (!isCallActive) {
			return res.status(400).json({ success: false, data: { error: 'Call is not active' } })
		}

		// check if requesting user exists
		const retrievedUser = await User.findByPk(email);
		if (retrievedUser === null) {
			console.error(`User with email: ${email} not found in Users table`);
			throw new Error("Error finding record for user joining call");
		}

		// check if user is logged as active participant on the call at present or if call has already finished
		const isUserActiveOnCall = await CallParticipants.findOne({
			where: {
				CallCallID: callID,
				UserEmail: email,
				status: 'active'
			}
		});
		const isCallFinished = requestedCall.finishedAt;

		if (!isUserActiveOnCall | isCallFinished) {
			res.status(403).json({ success: false, data: { error: 'Call is finished or user not an active participant' } })
		}

		const activeUserCount = await requestedCall.countUsers({
			where: { status: 'active' }
		});

		// handle if more than one user on call remaining
		if (activeUserCount > 1) {

			await requestedCall.removeUser(retrievedUser);
		} else {
			// handle if user is last person to leave

			const callFinishTime = Date.now();
			const callStartTime = requestedCall.startedAt;
			const callDurationSecs = (callFinishTime - callStartTime) / 1000;

			await requestedCall.update({
				activeCall: false,
				totalDurationSecs: callDurationSecs,
				finishedAt: callFinishTime
			});

			const isShutDownSuccess = await shutDownServer(callID);
			if (!isShutDownSuccess) {
				console.error("Error shutting down requested ws server");
			}
		}

		return res.status(200).json({ success: true, data: { message: 'User left call succesfully' } })

	} catch (err) {
		res.status(500).json({ success: false, data: { error: 'Server error' } });
	}
};

exports.sendMessage = async (req, res) => {

}