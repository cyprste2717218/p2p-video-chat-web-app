//require our websocket library 
var WebSocketServer=require('ws').Server;
const uuid=require('uuid');
const {handleNewParticipantOnCall,handleChatMessage,handleOffer,handleAnswer,handleICECandidate,constructURI,setRandomPort,getRelevantWSS}=require('./misc');
const {wss}=require('./session-store');


exports.createWebSocketsServer=async () => {

	const handleServerMessages=async (activeWSS) => {
		try {
			activeWSS.on('connection',function(connection) {

				//when server gets a message from a connected user 
				connection.on('message',async function(message) {

					let parsedMessage,type,data;

					try {
						parsedMessage=JSON.parse(message);
						console.log("this is the parsedMessage:",parsedMessage);
					} catch (err) {
						console.error("Couldn't parse message from stringified JSON");
					}

					if (!parsedMessage) {
						type="unnaccepted message type";
					} else {
						type=parsedMessage.type;
						data=parsedMessage.data;
					}

					console.log("this is the data:",data);

					switch (type) {
						case 'newParticipantOnCall':
							handleNewParticipantOnCall(data,connection)

							break;
						case 'chatMessage':
							handleChatMessage(data);

							break;
						case 'offer':

							handleOffer(data);
							break;
						case 'candidate':

							handleICECandidate(data);
							break;
						case 'answer':

							handleAnswer(data);
							break;
						default:
							console.log("message of unrecognised type sent:",type);


					}
				});

			});
		} catch (err) {
			console.error("An error occurred:",err);
			throw err;
		}


	}

	const callID=uuid.v4();

	//creating a websocket server at random port 
	const portNum=await setRandomPort();
	console.log("Port Number:",portNum);


	try {

		wss.push({[callID]: new WebSocketServer({port: portNum})});
		//console.log("these are the new Web Socket Server details:",wss);

		const activeWSS=await getRelevantWSS(callID);

		//console.log("the created activeWSS:",activeWSS);

		await handleServerMessages(activeWSS);

		const uri=await constructURI(callID);
		return {callID,uri};

	} catch (err) {
		console.error("This is the error:",err);
		throw new Error("Error creating WebSockets Server:",err);
	}



}

exports.shutDownServer=async (callID) => {
	console.log('Shutting down WebSocket server...');

	try {
		const activeWSS=await getRelevantWSS(callID);

		activeWSS.clients.forEach((client) => {
			if (client.readyState===WebSocket.OPEN) {
				client.close(1001,"Server is shutting down");
			}
		});

		activeWSS.close(() => {
			console.log('WebSocket server is completely stopped.');
		});

		return true;

	} catch (err) {
		console.error("An error occurred shutting down the ws server:",err)
		return false;
	}

}

