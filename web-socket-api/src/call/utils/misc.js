const {wss}=require('./session-store');
const {CallParticipants,Call,Op}=require('../../common/models');


exports.getRelevantWSS=async (callID) => {

	try {
		console.log("trying to find wss for:",callID);
		const foundWss=wss.find(wsServer => callID in wsServer);
		const activeWSS=foundWss? foundWss[callID]:null;

		if (!activeWSS) {
			throw new Error("No wss object found for callID");
		}
		console.log(`found a wss object for the call with ID ${callID}!`)
		return activeWSS;
	}
	catch (err) {
		console.error("Error retrieving requested wss object:",err);
	}
}

exports.participantNotOnCall=async (callID,email) => {

	try {
		const participant=await CallParticipants.findOne({
			where: {
				CallCallID: callID,
				UserEmail: email,
			}
		});

		if (participant) {
			return;
		}


		const errorMessage=
		{
			type: 'error',
			data: {
				message: "Message validation error"
			}
		};

		return errorMessage;

	} catch (err) {
		throw new Error("Error checking participant is on call:",err);
	}

}

exports.verifyClient=(info) => {

	try {

		const isProd=process.env.NODE_ENV==="production";
		if (isProd) {
			const allowedOrigins=['https://app.example.com']; //update this to vercel domain used
			if (!allowedOrigins.includes(info.origin)) {
				console.log(`Rejected unauthorized origin: ${info.origin}`);
				return false;
			}
			return true;
		}
		return true;
	} catch (err) {
		throw new Error("Error occured verifying Origin header on Websocket connection handshake:",err);
	}


}

exports.constructURI=async (callID) => {

	// constructing URI of WS server created
	const isProd=process.env.NODE_ENV==="production";

	const relevantWSS=await exports.getRelevantWSS(callID);
	const addressInfo=relevantWSS.address();

	const host=addressInfo.address==='::'? 'localhost':addressInfo.address;
	const port=addressInfo.port;

	let uri;
	if (isProd) {
		uri=`wss://${host}:${port}`;
	} else {
		uri=`ws://${host}:${port}`;
	}


	console.log("this is the uri:",uri);
	return uri;
}

exports.sendMsgToAllParticipants=async (message,callID) => {
	try {
		console.log("broadcasting message");

		//console.log("this is the current wss:",wss);

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
			//console.log("these are the activeWSS clients:",activeWSS.clients);


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

	try {
		const {username,email,callID}=data;
		console.log("New Participant joined:",username,email,callID);
		console.log(`User ${email} connected to WebSocket server`);
		const newParticipantNotif=
		{
			type: 'receivedNewParticipantNotif',
			data: {message: `${email} joined chat`,email: email}
		};

		console.log("About to call broadcast...");
		await exports.sendMsgToAllParticipants(newParticipantNotif,callID);

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
					data: {participants: otherCallParticipants,callID: callID,currentUserEmail: email}
				}
			)

			return currentCallParticipantsMsg;
		}

		return JSON.stringify(
			{
				type: 'responseCurrentCallParticipants',
				data: {participants: [],callID: callID,currentUserEmail: email}
			}
		)

	} catch (err) {
		console.error(`An error occured when responding to msg of new call participant joining call ${data.callID}: ${err}`,);
		return;
	}




}

exports.handleNewParticipantOnCall=async (data,connection) => {

	try {
		// setting new email property on connection (websocket client) object directly for targeting specific messages
		connection.email=data.email;

		// getting return object to send to client
		const currentCallParticipantsMsg=await exports.handleNewCallParticipantMsg(data);
		connection.send(currentCallParticipantsMsg);
	} catch (err) {
		console.error("An error occured forwarding new participant type message:",err);
	}

}

exports.handleChatMessage=async (data) => {

	try {
		const {email,message,callID}=data;

		const participantNotOnCallRes=await exports.participantNotOnCall(callID,email);

		if (participantNotOnCallRes) {
			return exports.sendMessageToParticipant(email,participantNotOnCallRes,callID);
		}

		const newChatMessage=
		{
			type: 'chatMessage',
			data: {
				message: message,
				email: email,
			}
		};

		await exports.sendMsgToAllParticipants(newChatMessage,callID);
	} catch (err) {
		console.error("Error occured forwarding chat message:",err);
	}

}

exports.handleICECandidate=async (data) => {

	try {
		const {caller,recipient,candidate,callID}=data;
		console.log(`User ${caller} sent ICE candidate to ${recipient}`);

		const participantNotOnCallRes=await exports.participantNotOnCall(callID,caller);

		if (participantNotOnCallRes) {
			return exports.sendMessageToParticipant(caller,participantNotOnCallRes,callID);
		}


		// prepare message format to return to intended recipient
		const iceCandidateForReceipient={
			type: 'candidate',
			data: {
				caller: caller,
				recipient: recipient,
				candidate: candidate,
				callID: callID
			}
		}

		exports.sendMessageToParticipant(recipient,iceCandidateForReceipient,callID);
	} catch (err) {
		console.error("Error occured forwarding ICE candidate message:",err);
	}


}

exports.handleOffer=async (data) => {

	try {
		const {offer,recipient,caller,callID}=data;
		console.log(`User ${caller} sent offer to ${recipient}: ${offer} on call ${callID}`);

		const participantNotOnCallRes=await exports.participantNotOnCall(callID,caller);

		if (participantNotOnCallRes) {
			return exports.sendMessageToParticipant(caller,participantNotOnCallRes,callID);
		}

		// prepare message format to return to intended recipient
		const offerMessageToReceipient={
			type: 'offer',
			data: {
				caller: caller,
				recipient: recipient,
				offer: offer,
				callID: callID
			}
		}

		exports.sendMessageToParticipant(recipient,offerMessageToReceipient,callID);
	} catch (err) {
		console.error("Error occured forwarding offer message:",err);
	}

}

exports.handleAnswer=async (data) => {

	try {
		const {caller,recipient,answer,callID}=data;
		console.log(`User ${recipient} sent answer to ${caller}`);

		const participantNotOnCallRes=await exports.participantNotOnCall(callID,caller);

		if (participantNotOnCallRes) {
			return exports.sendMessageToParticipant(caller,participantNotOnCallRes,callID);
		}

		// prepare message format to return to intended recipient
		const answerMessageToCaller={
			type: 'answer',
			data: {
				caller: caller,
				recipient: recipient,
				answer: answer,
				callID: callID
			}
		}
		exports.sendMessageToParticipant(caller,answerMessageToCaller,callID);

	} catch (err) {
		console.error("Error occured handling forwarding of answer:",err);
	}

}

exports.setRandomPort=async () => {
	function generateRandomPort() {
		return Math.floor(1000+Math.random()*9000);
	}
	const isProd=process.env.NODE_ENV==="production";

	let randomPort;
	try {
		// checking new port does not conflict with existing WS server
		const generatedPort=generateRandomPort();
		let targetWSUrl;

		if (isProd) {
			targetWSUrl=`wss://localhost:${generatedPort}`
		} else {
			targetWSUrl=`ws://localhost:${generatedPort}`
		}

		const isURLTaken=await Call.findOne({
			where: {
				callURL: targetWSUrl
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

		const portNum=exports.setRandomPort();
		randomPort=portNum;

	}

	return randomPort;

}