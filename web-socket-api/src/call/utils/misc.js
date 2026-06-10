const { wss } = require('./session-store');
const { CallParticipants } = require('../../common/models');

exports.constructURI = (callID) => {

	// constructing URI of WS server created
	const relevantWSS = wss.callID;
	const addressInfo = relevantWSS.address();

	const host = addressInfo.address === '::' ? 'localhost' : addressInfo.address;
	const port = addressInfo.port;

	const uri = `ws://${host}:${port}`;

	return uri;
}

exports.broadcast = (message) => {
	wss.clients.forEach((client) => {
		// Check if the connection is fully open
		if (client.readyState === 1) {
			client.send(JSON.stringify(message));
		}
	});
}

exports.sendMessageToParticipant = (targetParticipant, message) => {
	try {
		const participant = Array.from(wss.clients).find(client => client.username === targetParticipant);

		if (!(participant && participant.readyState === 1)) {
			throw new Error("Unable to find participant or participant ws connection not open");
		}
		participant.send(JSON.stringify(message));

	} catch (err) {
		console.error("Error occurred sending message to websocket client:", err);
	}


}

exports.handleNewCallParticipantMsg = async (data) => {

	const { username, email, callID } = data;
	console.log(`User ${username} connected to WebSocket server`);
	const newParticipantNotif =
	{
		type: 'receivedNewParticipantNotif',
		data: { message: `${username} joined chat` }
	}


	broadcast(newParticipantNotif);

	// Update status of user from 'pending' to 'active' on the call
	const currentCallParticipant = await CallParticipants.findOne({
		where: {
			CallCallID: callID,
			UserEmail: email,
		}
	});

	await currentCallParticipant.update({
		status: 'active'
	});


	// Returning names of current call participants to new participant to establish connections
	const activeUsers = await CallParticipants.findAll({
		where: {
			CallCallID: callID,
			status: 'active'
		}
	});

	if (activeUsers.length > 0) {

		console.log("the other participants on the call:", activeUsers);
		const otherCallParticipants = [];

		for (user in activeUsers) {
			if (user.email !== email) {
				otherCallParticipants.push(user.email);
			}
		}

		const currentCallParticipantsMsg = JSON.stringify(
			{
				type: 'responseCurrentCallParticipants',
				data: { participants: otherCallParticipants }
			}
		)

		return currentCallParticipantsMsg;
	}

	return JSON.stringify(
		{
			type: 'responseCurrentCallParticipants',
			data: { participants: [] }
		}
	)




}

exports.handleOffer = (data) => {
	const { caller, recipient, offer } = data;
	console.log(`User ${caller} sent offer to ${recipient}`);

	// prepare message format to return to intended recipient
	const offerMessageToReceipient = {
		type: 'offer',
		data: {
			caller: caller,
			recipient: recipient,
			offer: offer
		}
	}

	sendMessageToParticipant(recipient, offerMessageToReceipient);
}

exports.setRandomPort = async () => {
	function generateRandomPort() {
		return Math.floor(1000 + Math.random() * 9000);
	}

	let randomPort;
	try {
		// checking new port does not conflict with existing WS server
		const generatedPort = generateRandomPort();

		const isURLTaken = await Call.findOne({
			where: {
				callURL: `ws://localhost:${generatedPort}`
			}
		});

		if (isURLTaken) {
			throw new Error("Generated port number already in use");
		}

		randomPort = generatedPort;

	} catch (err) {
		if (err !== "Generated port number already in use") {
			throw new Error(err);
		}

		const portNum = setRandomPort();
		randomPort = portNum;

	}

	return randomPort;

}