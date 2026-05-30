import { getLocalMedia, sendOffer } from "./rtcUtils.js";

document.getElementById("hangup-button").addEventListener("click", hangUpCall);
document.getElementById("connect-button").addEventListener("click", connectToCall);
document.getElementById("create-call-button").addEventListener("click", createCall);

let websocket;

async function establishWebSocketServerConn(callURL) {

	// should have some error handling here around establishing ws connection
	websocket = new WebSocket(callURL);
}

async function connectToCall() {

	const enteredUsername = document.getElementById("username").value;
	const callID = document.getElementById("connect-to-call").value;

	const joinCallButton = document.getElementById("connect-button");
	joinCallButton.textContent = "Joining Call...";

	try {
		const result = await fetch(`http://localhost:3000/call/${callID}/join`, {
			method: "PUT",
			body: JSON.stringify({
				username: enteredUsername
			}),
			headers: {
				"Content-type": "application/json; charset=UTF-8"
			}
		});

		if (result.ok) {
			const dataBody = await result.json();

			console.log("result", dataBody);
			const { success, data } = dataBody;

			if (!success) {
				joinCallButton.textContent = "Join Call";
				throw new Error("Create new call failed");
			}

			const { callURL } = data;

			// fetch and display local video 
			await getLocalMedia();

			// establish connection to websocket server created
			await establishWebSocketServerConn(callURL);

			// display currrent call ID connected to in UI
			const currentcallIDDisplay = document.getElementById("current-call-id-display");
			currentcallIDDisplay.textContent = callID;

			// reset join call button to default text after connection established
			joinCallButton.textContent = "Join Call";

			if (websocket) {
				websocket.addEventListener("open", () => {

					console.log("Established websocket server connection succesfully");
					const messagesToSend = [];
					const msg1 = {
						"type": "newParticipantOnCall",
						"data": { username: enteredUsername, callID: callID }
					};
					messagesToSend.push(msg1);


					messagesToSend.map((message) => {
						websocket.send(JSON.stringify(message));
					});


				});


				// respond to messages from ws server
				websocket.addEventListener("message", (e) => {
					console.log("Received new message:", e.data);
					const message = JSON.parse(e.data);

					const { type, data } = message;

					switch (type) {
						case 'receivedNewParticipantNotif':
						case 'chatMessage':

							const chatMessage = data.message;


							// update DOM with message on new chat participant joining and/or new chat message
							const chatMessagesContainer = document.getElementById('chat-messages');
							const newPara = document.createElement('p');

							newPara.textContent = chatMessage;
							chatMessagesContainer.appendChild(newPara);

							break;

						case 'responseCurrentCallParticipants':
							const otherCallParticipants = data.participants;
							const callerText = document.getElementById("username").value;

							console.log("other call participants receieved:", otherCallParticipants);

							otherCallParticipants.forEach(participant => {
								const createdOffer = sendOffer(callerText, participant);
								websocket.send(JSON.stringify(createdOffer))
							});

							// Update DOM to display current participants on call being joined
							const currentParticipantsContainer = document.getElementById('call-participants-list');

							otherCallParticipants.map((participantName) => {
								const newPara = document.createElement('p');

								newPara.textContent = participantName;

								currentParticipantsContainer.appendChild(newPara);
							})

							break;

						case 'offer':
							const { caller, recipient, offer } = data;
							console.log(`Received offer message from user ${caller}`);

							break;
					}
				})


			}




		}

	} catch (err) {
		joinCallButton.textContent = "Join Call";
		console.error("An error occurred:", err);
	}
}

function hangUpCall() {

}

async function createCall() {

	const enteredUsername = document.getElementById("username").value;

	const createCallButton = document.getElementById("create-call-button");
	createCallButton.textContent = "Creating Call...";

	try {
		const result = await fetch("http://192.168.0.60:3000/call/create", {
			method: "POST",
			body: JSON.stringify({
				username: enteredUsername
			}),
			headers: {
				"Content-type": "application/json; charset=UTF-8"
			}
		});

		if (result.ok) {

			const dataBody = await result.json();

			console.log("result", dataBody);
			const { success, data } = dataBody;


			if (!success) {
				createCallButton.textContent = "Create Call";
				throw new Error("Create new call failed");
			}

			const { callID, callURL } = data;

			const currentcallIDDisplay = document.getElementById("current-call-id-display");
			currentcallIDDisplay.textContent = callID;

			createCallButton.textContent = "Create Call";

			// fetch and display local video 
			await getLocalMedia();

			// establish connection to websocket server created
			await establishWebSocketServerConn(callURL);

			if (websocket) {
				websocket.addEventListener("open", () => {

					console.log("Established websocket server connection succesfully");
					const messagesToSend = [];
					const msg1 = {
						"type": "newParticipantOnCall",
						"data": { username: enteredUsername, callID: callID }
					};
					messagesToSend.push(msg1);


					messagesToSend.map((message) => {
						websocket.send(JSON.stringify(message));
					});


				});


				// respond to messages from ws server
				websocket.addEventListener("message", (e) => {
					console.log("Received new message:", e.data);
					const message = JSON.parse(e.data);

					const { type, data } = message;

					switch (type) {
						case 'receivedNewParticipantNotif':
						case 'chatMessage':

							const chatMessage = data.message;


							// update DOM with message on new chat participant joining and/or new chat message
							const chatMessagesContainer = document.getElementById('chat-messages');
							const newPara = document.createElement('p');

							newPara.textContent = chatMessage;
							chatMessagesContainer.appendChild(newPara);

							break;
						case 'responseCurrentCallParticipants':
							const otherCallParticipants = data.participants;
							const callerText = document.getElementById("username").value;

							otherCallParticipants.forEach(participant => {
								const createdOffer = sendOffer(callerText, participant);
								websocket.send(JSON.stringify(createdOffer))
							});

							// Update DOM to display current participants on call being joined
							const currentParticipantsContainer = document.getElementById('my-container');

							otherCallParticipants.map((participantName) => {
								const newPara = document.createElement('p');

								newPara.textContent = participantName;

								currentParticipantsContainer.appendChild(newPara);
							})

							break;
						case 'offer':
							const { caller, recipient, offer } = data;
							console.log(`Received offer message from user ${caller}`);

							break;
					}
				})


			}

		}

	} catch (err) {
		console.error("An error occurred:", err);
		createCallButton.textContent = "Create Call";
	}

}

