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

	// Returning names of current call participants to new participant to establish connections
	const activeUsers = await CallParticipants.findAll({
		where: {
			CallCallID: callID,
			UserEmail: email,
			status: 'active'
		}
	});

	if (activeUsers.length > 0) {

		console.log("the other participants on the call:", joinedCall);

		// TO-DO: retrieve participant etaisl from db to send on
		/* const { participants, pendingParticipants } = joinedCall;


		// filter out email from list of participants to connect to 
		const otherCallParticipants = participants.filter((participant) => participant !== email); */


		const currentCallParticipantsMsg = JSON.stringify(
			{
				type: 'responseCurrentCallParticipants',
				data: { participants: otherCallParticipants }
			}
		)



		// TODO: handle update in-memory config of pending and current call participants
		/* pendingParticipants.remove(username)
		participants.push(username) */

		return currentCallParticipantsMsg;
	}




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

exports.setRandomPort = () => {
	function generateRandomPort() {
		return Math.floor(1000 + Math.random() * 9000);
	}

	let randomPort;
	try {
		// checking new port does not conflict with existing WS server
		const generatedPort = generateRandomPort();


		if (activeSessions.size > 0) {
			const activelyUsedPorts = [...activeSessions.keys()];
			const portsSet = new Set(activelyUsedPorts);
			if (portsSet.has(generatedPort)) {
				throw new Error("Generated port number already in use");
			}
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