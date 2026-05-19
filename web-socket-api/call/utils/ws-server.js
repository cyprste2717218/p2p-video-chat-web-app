//require our websocket library 
var WebSocketServer = require('ws').Server;
const uuid = require('uuid');
let wss;

function broadcast(message) {
	wss.clients.forEach((client) => {
		// Check if the connection is fully open
		if (client.readyState === 1) {
			client.send(message);
		}
	});
}

function sendMessageToParticipant(targetParticipant, message) {
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

const activeSessions = new Map();
exports.activeSessions = activeSessions;

exports.createWebSocketsServer = async () => {



	function setRandomPort() {
		function generateRandomPort() {
			return Math.floor(1000 + Math.random() * 9000);
		}

		let randomPort;
		try {
			// checking new port does not conflict with existing WS server
			const generatedPort = generateRandomPort();


			const activelyUsedPorts = [...activeSessions.keys()];
			const portsSet = new Set(activelyUsedPorts);
			if (portsSet.has(generatedPort)) {
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

	const callId = uuid.v4();

	//creating a websocket server at random port 
	const portNum = setRandomPort();
	console.log("Port Number:", portNum);


	try {
		wss = new WebSocketServer({ port: portNum });

		wss.on('connection', function (connection) {


			//when server gets a message from a connected user 
			connection.on('message', function (message) {

				const parsedMessage = JSON.parse(message);

				const { type, data } = parsedMessage;

				switch (type) {
					case 'newParticipantOnCall':

						const { username, callId } = data;
						// setting new username property on connection (websocket client) object directly for targeting specific messages
						connection.username = username;


						console.log(`User ${username} connected to WebSocket server`);
						const newParticipantNotif = JSON.stringify(
							{
								type: 'receivedNewParticipantNotif',
								data: { message: `${data.username} joined chat` }
							}
						)

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

							connection.send(currentCallParticipantsMsg)

							// TODO: handle update in-memory config of pending and current call participants
							/* pendingParticipants.remove(username)
							participants.push(username) */
						}

						break;
					case 'chatMessage':
						const newChatMessage = JSON.stringify(
							{
								type: 'receivedNewChatMessage',
								data: { message: data.message }
							}
						)

						broadcast(newChatMessage);
						break;
					case 'requestAllParticipantNames':
						const allParticipantsNamesArr = activeSessions.callId.participants;

						const allParticipantsNames = JSON.stringify(
							{
								type: 'allParticipantsNames',
								data: allParticipantsNamesArr
							}
						)
						break;
					case 'offer':
						// TODO: Implement
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


						break;
					default:
						console.log("message of unrecognised type sent:", type);


				}
			});

		});

		// constructing URI of WS server created
		const addressInfo = wss.address();

		const host = addressInfo.address === '::' ? 'localhost' : addressInfo.address;
		const port = addressInfo.port;

		const uri = `ws://${host}:${port}`;


		return { callId, uri };
	} catch (err) {
		throw new Error("Error creating WebSockets Server:", err);
	}



}

