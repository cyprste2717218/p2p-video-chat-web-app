//require our websocket library 
var WebSocketServer = require('ws').Server;
const uuid = require('uuid');
const { wss, handleOffer, handleNewCallParticipantMsg, broadcast, constructURI } = require('./misc');

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

						// setting new username property on connection (websocket client) object directly for targeting specific messages
						connection.username = data.username;

						// getting return object to sendd to client
						const currentCallParticipantsMsg = handleNewCallParticipantMsg(data);
						connection.send(currentCallParticipantsMsg)
						break;
					case 'chatMessage':
						const newChatMessage =
						{
							type: 'receivedNewChatMessage',
							data: { message: data.message }
						}


						broadcast(newChatMessage);
						break;
					case 'offer':

						handleOffer(data);
						break;
					default:
						console.log("message of unrecognised type sent:", type);


				}
			});

		});

		const uri = constructURI();
		return { callId, uri };

	} catch (err) {
		throw new Error("Error creating WebSockets Server:", err);
	}



}

