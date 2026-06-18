//require our websocket library 
var WebSocketServer = require('ws').Server;
const uuid = require('uuid');
const { handleOffer, handleNewCallParticipantMsg, broadcast, constructURI, setRandomPort } = require('./misc');
const { wss } = require('./session-store');


exports.createWebSocketsServer = async () => {

	const handleServerMessages = async (activeWSS) => {
		try {
			activeWSS.on('connection', function (connection) {

				//when server gets a message from a connected user 
				connection.on('message', function (message) {

					let parsedMessage, type, data;

					try {
						parsedMessage = JSON.parse(message);
					} catch (err) {
						console.error("Couldn't parse message from stringified JSON");
					}

					if (!parsedMessage) {
						type = "unnaccepted message type";
					} else {
						type = parsedMessage.type;
						data = parsedMessage.data;
					}

					switch (type) {
						case 'newParticipantOnCall':

							// setting new username property on connection (websocket client) object directly for targeting specific messages
							connection.username = data.username;

							// getting return object to send to client
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
		} catch (err) {
			console.error("An error occurred:", err);
			throw err;
		}


	}

	const callID = uuid.v4();

	//creating a websocket server at random port 
	const portNum = await setRandomPort();
	console.log("Port Number:", portNum);


	try {

		wss.callID = new WebSocketServer({ port: portNum });
		const activeWSS = wss.callID;

		await handleServerMessages(activeWSS);

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

