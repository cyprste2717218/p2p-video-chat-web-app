document.getElementById("hangup-button").addEventListener("click", hangUpCall);
document.getElementById("connect-button").addEventListener("click", connectToCall);
document.getElementById("create-call-button").addEventListener("click", createCall);

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

			const { callURL, otherCallParticipants } = data;

			// establish connection to websocket server created
			const websocket = new WebSocket(callURL);

			websocket.addEventListener("open", () => {
				websocket.send(`${enteredUsername} CONNECTED`);

			});

			// display currrent call ID connected to in UI
			const currentCallIdDisplay = document.getElementById("current-call-id-display");
			currentCallIdDisplay.textContent = callId;

			// reset join call button to default text after connection established
			joinCallButton.textContent = "Join Call";
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
			const websocket = new WebSocket(callURL);

			websocket.addEventListener("open", () => {
				websocket.send(`${enteredUsername} CONNECTED`);

			});


		}

	} catch (err) {
		console.error("An error occurred:", err);
		createCallButton.textContent = "Create Call";
	}

}

