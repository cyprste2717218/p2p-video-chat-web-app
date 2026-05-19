//require our websocket library 
var WebSocketServer = require('ws').Server;
const uuid = require('uuid');
let wss;

function broadcast(message) {
	wss.clients.forEach((client) => {

		// Check if the connection is fully open
		if (client.readyState === 1) {
			console.log("Client is ready")
			client.send(message);
		}
	});
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

						console.log(`User ${username} connected to WebSocket server`);
						const newParticipantNotif = JSON.stringify(
							{
								type: 'receivedNewParticipantNotif',
								data: { message: `${data.username} joined chat` }
							}
						)

						broadcast(newParticipantNotif);

						// Returning names of current call participants to new participant to establish connections
						const joinedCall = activeSessions.get(callId)
						const { participants, pendingParticipants } = joinedCall;
						if (participants.length !== 1) {

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
						console.log(`User ${caller} sent offer to ${recipient}. Offer is ${offer}`)
						break;


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

