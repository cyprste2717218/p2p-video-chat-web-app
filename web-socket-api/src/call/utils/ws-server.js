//require our websocket library 
var WebSocketServer = require('ws').Server;
const uuid = require('uuid');
const { handleOffer, handleNewCallParticipantMsg, broadcast, constructURI, setRandomPort } = require('./misc');
const { wss } = require('./session-store');


exports.createWebSocketsServer = async () => {

	const callID = uuid.v4();

	//creating a websocket server at random port 
	const portNum = setRandomPort();
	console.log("Port Number:", portNum);


	try {
		wss.callID = new WebSocketServer({ port: portNum });

		const activeWSS = wss.callID;

		activeWSS.on('connection', function (connection) {

			//when server gets a message from a connected user 
			connection.on('message', function (message) {

				const parsedMessage = JSON.parse(message);

				const { type, data, callID } = parsedMessage;

				switch (type) {
					case 'newParticipantOnCall':

						// setting new username property on connection (websocket client) object directly for targeting specific messages
						connection.username = data.username;

						// getting return object to sendd to client
						const currentCallParticipantsMsg = handleNewCallParticipantMsg(data);
						connection.send(currentCallParticipantsMsg);
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

		const uri = constructURI(callID);
		return { callID, uri };

	} catch (err) {
		console.error("This is the error:", err);
		throw new Error("Error creating WebSockets Server:", err);
	}



}

exports.shutDownServer = async (callID) => {
	console.log('Shutting down WebSocket server...');

	try {
		wss.callID.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.close(1001, "Server is shutting down");
			}
		});

		wss.callID.close(() => {
			console.log('WebSocket server is completely stopped.');
		});

		return true;

	} catch (err) {
		console.error("An error occurred shutting down the ws server:", err)
		return false;
	}

}

