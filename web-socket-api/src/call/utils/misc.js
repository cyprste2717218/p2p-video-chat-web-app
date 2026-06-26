const {wss}=require('./session-store');
const {CallParticipants,Call,Op}=require('../../common/models');

exports.getRelevantWSS=async (callID) => {

	try {
		const foundWss=wss.find(wsServer => callID in wsServer);
		const activeWSS=foundWss? foundWss[callID]:null;

		if (!activeWSS) {
			throw new Error("No wss object found for callID");
		}

		return activeWSS;
	}
	catch (err) {
		console.error("Error retrieving requested wss object:",err);
	}
}

exports.constructURI=async (callID) => {

	// constructing URI of WS server created


	const relevantWSS=await exports.getRelevantWSS(callID);
	const addressInfo=relevantWSS.address();

	const host=addressInfo.address==='::'? 'localhost':addressInfo.address;
	const port=addressInfo.port;

	const uri=`ws://${host}:${port}`;

	console.log("this is the uri:",uri);
	return uri;
}

exports.broadcast=async (message,callID) => {
	try {
		console.log("broadcasting message");

		console.log("this is the current wss:",wss);

		// get correct wss server to send messages to joined participants on
		const activeWSS=await exports.getRelevantWSS(callID);


		if (activeWSS.clients) {

			activeWSS.clients.forEach(async (client) => {
				// Check if the connection is fully open
				if (client.readyState===1) {
					await client.send(JSON.stringify(message));
				}
			});
		}
	} catch (err) {
		console.error(`Error during message broadcast for callID: ${callID}: ${err}`)
	}


}

exports.sendMessageToParticipant=async (targetParticipant,message,callID) => {
	try {

		// get correct wss server to send messages to joined participants on
		const activeWSS=await exports.getRelevantWSS(callID);

		if (activeWSS.clients) {
			console.log("these are the activeWSS clients:",activeWSS.clients);


			const participant=[...activeWSS.clients].find(client => client.email===targetParticipant);

			if (!(participant&&participant.readyState===1)) {
				throw new Error("Unable to find participant or participant ws connection not open");
			}
			console.log("Found participant to send msg to:",participant.email);
			participant.send(JSON.stringify(message));
		}



	} catch (err) {
		console.error("Error occurred sending message to websocket client:",err);
	}


}

exports.handleNewCallParticipantMsg=async (data) => {

	const {username,email,callID}=data;
	console.log("New Participant joined:",username,email,callID);
	console.log(`User ${email} connected to WebSocket server`);
	const newParticipantNotif=
	{
		type: 'receivedNewParticipantNotif',
		data: {message: `${email} joined chat`}
	}

	console.log("About to call broadcast...");
	await exports.broadcast(newParticipantNotif,callID);

	// Update status of user from 'pending' to 'active' on the call
	console.log("this is the callID:",callID);
	const currentCallParticipant=await CallParticipants.findOne({
		where: {
			CallCallID: callID,
			UserEmail: email,
		}
	});

	await currentCallParticipant.update({
		status: 'active'
	});


	// Returning names of current call participants to new participant to establish connections
	const activeUsers=await CallParticipants.findAll({
		where: {
			CallCallID: callID,
			status: 'active',
			userEmail: {
				[Op.ne]: email
			}
		},
		raw: true
	});


	if (activeUsers.length>0) {

		console.log("activeUsers are:",activeUsers[0]);
		const otherCallParticipants=activeUsers.map(user => user.userEmail);

		const currentCallParticipantsMsg=JSON.stringify(
			{
				type: 'responseCurrentCallParticipants',
				data: {participants: otherCallParticipants,callID: callID}
			}
		)

		return currentCallParticipantsMsg;
	}

	return JSON.stringify(
		{
			type: 'responseCurrentCallParticipants',
			data: {participants: [],callID: callID}
		}
	)




}

exports.handleICECandidate=(data) => {
	const {caller,recipient,candidate,callID}=data;
	console.log(`User ${caller} sent ICE candidate to ${recipient}`);

	// prepare message format to return to intended recipient
	const iceCandidateForReceipient={
		type: 'candidate',
		data: {
			caller: caller,
			recipient: recipient,
			candidate: candidate
		}
	}

	exports.sendMessageToParticipant(recipient,iceCandidateForReceipient,callID);

}

exports.handleOffer=(data) => {
	const {caller,recipient,offer,callID}=data;
	console.log(`User ${caller} sent offer to ${recipient}`);

	// prepare message format to return to intended recipient
	const offerMessageToReceipient={
		type: 'offer',
		data: {
			caller: caller,
			recipient: recipient,
			offer: offer
		}
	}

	exports.sendMessageToParticipant(recipient,offerMessageToReceipient,callID);
}

exports.setRandomPort=async () => {
	function generateRandomPort() {
		return Math.floor(1000+Math.random()*9000);
	}

	let randomPort;
	try {
		// checking new port does not conflict with existing WS server
		const generatedPort=generateRandomPort();

		const isURLTaken=await Call.findOne({
			where: {
				callURL: `ws://localhost:${generatedPort}`
			}
		});

		if (isURLTaken) {
			throw new Error("Generated port number already in use");
		}

		randomPort=generatedPort;

	} catch (err) {
		if (err!=="Generated port number already in use") {
			throw new Error(err);
		}

		const portNum=setRandomPort();
		randomPort=portNum;

	}

	return randomPort;

}