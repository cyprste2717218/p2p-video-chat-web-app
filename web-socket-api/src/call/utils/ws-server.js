import process from 'node:process';
import WebSocket, {WebSocketServer} from 'ws';
import {v4 as uuidv4} from 'uuid';
import {
	handleNewParticipantOnCall,
	handleChatMessage,
	handleOffer,
	handleAnswer,
	handleICECandidate,
	constructURI,
	getRelevantWSS,
	verifyClient,
	handleParticipantLeftCall,
	setRandomPort,
} from './misc.js';
import {wss} from './session-store.js';

export function handleUpgrade(request, socket, head) {
	console.log('connection upgrade in progress...');

	const isLocal = process.env.LOCAL === 'true';

	const match = isLocal
		? request.url.match(/^\/ws\/([\w\-]+)$/v)
		: request.url.match(/^\/wss\/([\w\-]+)$/v);

	if (!match) return socket.destroy();
	const callID = match[1];
	const entry = wss.get(callID);
	if (!entry) return socket.destroy();
	entry.server.handleUpgrade(request, socket, head, (ws) => {
		entry.server.emit('connection', ws, request);
	});

	console.log('connection upgrade finished');
}

export async function createWebSocketsServer() {
	const handleServerMessages = async (activeWSS, callID) => {
		try {
			activeWSS.on('connection', function (connection) {
				// When server gets a message from a connected user
				connection.on('message', async function (message) {
					let parsedMessage;
					let type;
					let data;

					try {
						parsedMessage = JSON.parse(message);
						console.log('this is the parsedMessage:', parsedMessage);
					} catch {
						console.error("Couldn't parse message from stringified JSON");
					}

					if (parsedMessage) {
						type = parsedMessage.type;
						data = parsedMessage.data;
					} else {
						type = 'unnaccepted message type';
					}

					switch (type) {
						case 'newParticipantOnCall': {
							handleNewParticipantOnCall(data, connection);

							break;
						}

						case 'chatMessage': {
							handleChatMessage(data);

							break;
						}

						case 'offer': {
							handleOffer(data);
							break;
						}

						case 'candidate': {
							handleICECandidate(data);
							break;
						}

						case 'answer': {
							handleAnswer(data);
							break;
						}

						default: {
							console.log('message of unrecognised type sent:', type);
						}
					}
				});

				// When connection closes
				connection.on('close', function (connection) {
					const data = {
						leavingUser: connection.email,
						callID,
					};

					handleParticipantLeftCall(data);
				});
			});
		} catch (error) {
			console.error('An error occurred:', error);
			throw error;
		}
	};

	const isProd = process.env.NODE_ENV === 'production';

	const callID = uuidv4();

	// Hardcoded port if in dev mode (NODE_ENV = 'dev'); random port in production
	const portNumber = isProd ? await setRandomPort() : 3000;

	try {
		const wsServerOptions = isProd
			? {
					port: portNumber,
					perMessageDeflate: false,
					verifyClient: (info) => verifyClient(info),
					maxPayload: 64 * 1024,
				}
			: {
					noServer: true,
					perMessageDeflate: false,
					verifyClient: (info) => verifyClient(info),
					maxPayload: 64 * 1024,
				};

		wss.set(callID, {
			server: new WebSocketServer(wsServerOptions),
		});

		const activeWSS = await getRelevantWSS(callID);

		await handleServerMessages(activeWSS.server, callID);

		const uri = await constructURI(callID);
		return {callID, uri};
	} catch (error) {
		console.error('This is the error:', error);
		throw new Error('Error creating WebSockets Server', {cause: error});
	}
}

export async function shutDownServer(callID) {
	console.log('Shutting down WebSocket server...');

	try {
		const activeWSS = await getRelevantWSS(callID);

		for (const client of activeWSS.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.close(1001, 'Server is shutting down');
			}
		}

		activeWSS.close(() => {
			console.log('WebSocket server is completely stopped.');
		});

		return true;
	} catch (error) {
		console.error('An error occurred shutting down the ws server:', error);
		return false;
	}
}
