document.getElementById("hangup-button").addEventListener("click", hangUpCall);
document.getElementById("connect-button").addEventListener("click", connectToCall);
document.getElementById("create-call-button").addEventListener("click", createCall);

async function establishWebSocketServerConn(callURL, operation) {
	const websocket = new WebSocket(callURL);

	const messagesToSend = [];

	switch (operation) {
		case 'joinCall':
			const msg1 = {
				"type": "chatMessage",
				"data": `${enteredUsername} joined the call`
			};

			const msg2 = {
				"type": "newParticipantOnCall",
				"data": enteredUsername
			};

			messagesToSend.push(msg1, msg2);

			break;
		case 'createCall':


			break;
	}

	websocket.addEventListener("open", () => {

		// send needed messages to ws server after participant has succesfully created, joined or left a call
		messagesToSend.map((message) => {
			websocket.send(JSON.stringify(message));
		});

	});

	// respond to messages from ws server
	websocket.addEventListener("message", (e) => {
		const message = JSON.parse(e.data);
	})


}

function sendToServer(msg) {
	const msgJSON = JSON.stringify(msg);

	connection.send(msgJSON);
}


async function connectToCall() {

	const enteredUsername = document.getElementById("username").value;
	const callId = document.getElementById("connect-to-call").value;

	const joinCallButton = document.getElementById("connect-button");
	joinCallButton.textContent = "Joining Call...";

	try {
		const result = await fetch(`http://localhost:3000/call/join/${callId}`, {
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

			// establish connection to websocket server created
			await establishWebSocketServerConn(callURL, 'joinCall');

			// display currrent call ID connected to in UI
			const currentCallIdDisplay = document.getElementById("current-call-id-display");
			currentCallIdDisplay.textContent = callId;

			// reset join call button to default text after connection established
			joinCallButton.textContent = "Join Call";

			// display current participants on call joined
			const container = document.getElementById('my-container');

			otherCallParticipants.map((participantName) => {
				const newPara = document.createElement('p');

				newPara.textContent = participantName;

				container.appendChild(newPara);
			})




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
		const result = await fetch("http://localhost:3000/call/create", {
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

			const { callId, callURL } = data;

			const currentCallIdDisplay = document.getElementById("current-call-id-display");
			currentCallIdDisplay.textContent = callId;

			createCallButton.textContent = "Create Call";

			// establish connection to websocket server created
			await establishWebSocketServerConn();


		}

	} catch (err) {
		console.error("An error occurred:", err);
		createCallButton.textContent = "Create Call";
	}

}

