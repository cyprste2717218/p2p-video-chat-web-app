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

export const activeSessions = new Map();

exports.createWebSocketsServer = async () => {

	const callId = uuid.v4();

	//creating a websocket server at port 9090 
	wss = new WebSocketServer({ port: 9090 });

	wss.on('connection', function (connection) {
		console.log("user connected");

		//when server gets a message from a connected user 
		connection.on('message', function (message) {

			const parsedMessage = JSON.parse(message);

			const { type, data } = parsedMessage;

			switch (type) {
				case 'newParticipantOnCall':

					const newParticipantNotif = JSON.stringify(
						{
							type: 'receivedNewParticipantNotif',
							data: data
						}
					)

					broadcast(newParticipantNotif);
					break;
				case 'chatMessage':
					const newChatMessage = JSON.stringify(
						{
							type: 'receivedNewChatMessage',
							data: data
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


			}

			console.log("Got message from a user:", message);
		});

		connection.send("Hello from server");
	});

	// constructing URI of WS server created
	const addressInfo = wss.address();

	const host = addressInfo.address === '::' ? 'localhost' : addressInfo.address;
	const port = addressInfo.port;

	const uri = `ws://${host}:${port}`;


	return { callId, uri };
}

