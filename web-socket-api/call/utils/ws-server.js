//require our websocket library 
var WebSocketServer = require('ws').Server;
const uuid = require('uuid');

exports.createWebSocketsServer = async () => {

	const callId = uuid.v4();

	//creating a websocket server at port 9090 
	var wss = new WebSocketServer({ port: 9090 });

	wss.on('connection', function (connection) {
		console.log("user connected");

		//when server gets a message from a connected user 
		connection.on('message', function (message) {
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
