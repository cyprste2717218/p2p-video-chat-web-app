const { wss, activeSessions } = require('./session-store');

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

exports.handleNewCallParticipantMsg = (data) => {

	const { username, callId } = data;
	console.log(`User ${username} connected to WebSocket server`);
	const newParticipantNotif =
	{
		type: 'receivedNewParticipantNotif',
		data: { message: `${username} joined chat` }
	}


	broadcast(newParticipantNotif);

	// Returning names of current call participants to new participant to establish connections
	const joinedCall = activeSessions.get(callId);
	console.log("the other participants on the call:", joinedCall);
	const { participants, pendingParticipants } = joinedCall;

	const totalParticipants = participants.length + pendingParticipants.length;
	if (totalParticipants !== 1) {

		// filter out username from list of participants to connect to 
		const otherCallParticipants = participants.filter((participant) => participant !== username);


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