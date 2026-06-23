import {getLocalMedia,sendOffer} from "./rtcUtils.js";

const connectToCallButton=document.getElementById("connect-button");
connectToCallButton.addEventListener("click",connectToCall);

const createCallButton=document.getElementById("create-call-button");
createCallButton.addEventListener("click",createCall);

const hangUpButton=document.getElementById("hangup-button");
hangUpButton.addEventListener("click",hangUpCall);

const registerButton=document.getElementById("register-button");
registerButton.addEventListener("click",register);

const loginButton=document.getElementById("login-button");
loginButton.addEventListener("click",login);

const logoutButton=document.getElementById("logout-button");
logoutButton.addEventListener("click",logout);

const usernameInput=document.getElementById("username");
const emailInput=document.getElementById("email");
const passwordInput=document.getElementById("password");


let websocket;
const tokenWorker=new Worker('../token-worker.js',{type: "module"});

async function getWorkerResponse(messageReqType,messageResType,requestBody) {
	console.log("GetWorkerResponse triggered:",messageReqType,messageResType,requestBody);
	return new Promise((resolve,reject) => {

		tokenWorker.onmessage=function(event) {
			if (event.data.type===`${messageResType}`) {
				console.log("Received resType of:",event.data.type);
				resolve(event.data.message);
			}
			reject("Receieved improper message response type back:",event.data.type);
		};

		tokenWorker.postMessage({messageType: messageReqType,requestBody: requestBody});
	});
}

async function register() {

	try {

		registerButton.textContent="Registering...";
		const signUpBody={
			username: usernameInput.value,
			email: emailInput.value,
			password: passwordInput.value
		}

		const result=await getWorkerResponse("ReqSignup","ResSignup",signUpBody);

		if (result==="Signup failed") {
			alert(result);
			throw new Error(result);
		}

		connectToCallButton.disabled=false;
		createCallButton.disabled=false;
		registerButton.disabled=true;
		registerButton.textContent="Register";

		alert(result);


	} catch (err) {
		registerButton.textContent="Register";
		console.error("An error occurred:",err);
	}
}

async function login() {
	try {

		loginButton.textContent="Logging in...";

		const loginBody={
			username: usernameInput.value,
			email: emailInput.value,
			password: passwordInput.value
		}

		const result=await getWorkerResponse("ReqLogin","ResLogin",loginBody);

		if (result==="Login failed") {
			alert(result);
			throw new Error(result);
		}

		connectToCallButton.disabled=false;
		createCallButton.disabled=false;
		loginButton.disabled=true;
		loginButton.textContent="Login";

		alert(result);


	} catch (err) {
		loginButton.textContent="Login";
		console.error("An error occurred:",err);
	}
}

async function logout() {
	try {

		logoutButton.textContent="Logging out...";

		const result=await getWorkerResponse("ReqLogout","ResLogout");

		if (result==="Logout failed") {
			alert(result);
			throw new Error(result);
		}

		joinCallButton.disabled=false;
		createCallButton.disabled=false;
		logoutButton.disabled=true;
		logoutButton.textContent="Logout";

		alert(result);


	} catch (err) {
		logoutButton.textContent="Logout";
		console.error("An error occurred:",err);
	}
}

async function establishWebSocketServerConn(callURL) {

	// should have some error handling here around establishing ws connection
	websocket=new WebSocket(callURL);
}

async function connectToCall() {

	const enteredUsername=usernameInput.value;
	const enteredEmail=emailInput.value;
	const callID=document.getElementById("connect-to-call").value;

	const joinCallButton=document.getElementById("connect-button");
	joinCallButton.textContent="Joining Call...";

	try {
		const result=await getWorkerResponse("ReqJoinCall","ResJoinCall",callID);

		if (result==="Join new call failed") {
			alert(result);
			throw new Error(result);
		}

		const callURL=result;

		// fetch and display local video 
		await getLocalMedia();

		// establish connection to websocket server created
		await establishWebSocketServerConn(callURL);

		// display currrent call ID connected to in UI
		const currentcallIDDisplay=document.getElementById("current-call-id-display");
		currentcallIDDisplay.textContent=callID;

		// reset join call button to default text after connection established
		joinCallButton.textContent="Join Call";

		if (websocket) {
			websocket.addEventListener("open",() => {

				console.log("Established websocket server connection succesfully");
				const messagesToSend=[];
				const msg1={
					"type": "newParticipantOnCall",
					"data": {username: enteredUsername,callID: callID,email: enteredEmail}
				};
				messagesToSend.push(msg1);


				messagesToSend.map((message) => {
					websocket.send(JSON.stringify(message));
				});


			});


			// respond to messages from ws server
			websocket.addEventListener("message",(e) => {
				console.log("Received new message:",e.data);
				const message=JSON.parse(e.data);

				const {type,data}=message;

				switch (type) {
					case 'receivedNewParticipantNotif':
					case 'chatMessage':

						const chatMessage=data.message;


						// update DOM with message on new chat participant joining and/or new chat message
						const chatMessagesContainer=document.getElementById('chat-messages');
						const newPara=document.createElement('p');

						newPara.textContent=chatMessage;
						chatMessagesContainer.appendChild(newPara);

						break;

					case 'responseCurrentCallParticipants':
						const otherCallParticipants=data.participants;
						const callerText=document.getElementById("username").value;

						console.log("other call participants receieved:",otherCallParticipants);

						otherCallParticipants.forEach(participant => {
							const createdOffer=sendOffer(callerText,participant);
							websocket.send(JSON.stringify(createdOffer))
						});

						// Update DOM to display current participants on call being joined
						const currentParticipantsContainer=document.getElementById('call-participants-list');

						otherCallParticipants.map((participantName) => {
							const newPara=document.createElement('p');

							newPara.textContent=participantName;

							currentParticipantsContainer.appendChild(newPara);
						})

						break;

					case 'offer':
						const {caller,recipient,offer}=data;
						console.log(`Received offer message from user ${caller} `);

						break;
				}
			})


		}


	} catch (err) {
		joinCallButton.textContent="Join Call";
		console.error("An error occurred:",err);
	}
}

function hangUpCall() {
	/* To be implemented */
}

async function createCall() {

	const enteredUsername=document.getElementById("username").value;
	const enteredEmail=emailInput.value;

	const createCallButton=document.getElementById("create-call-button");
	createCallButton.textContent="Creating Call...";

	try {

		const result=await getWorkerResponse("ReqCreateCall","ResCreateCall");

		if (result==="Create new call failed") {
			createCallButton.textContent="Create Call";
			alert(result);
			throw new Error(result);
		}

		const {callID,callURL}=result;

		const currentcallIDDisplay=document.getElementById("current-call-id-display");
		currentcallIDDisplay.textContent=callID;

		createCallButton.textContent="Create Call";

		// fetch and display local video 
		await getLocalMedia();

		// establish connection to websocket server created
		await establishWebSocketServerConn(callURL);

		if (websocket) {
			websocket.addEventListener("open",() => {

				console.log("Established websocket server connection succesfully");
				const messagesToSend=[];
				const msg1={
					"type": "newParticipantOnCall",
					"data": {username: enteredUsername,email: enteredEmail,callID: callID}
				};
				messagesToSend.push(msg1);


				messagesToSend.map((message) => {
					websocket.send(JSON.stringify(message));
				});


			});


			// respond to messages from ws server
			websocket.addEventListener("message",(e) => {
				console.log("Received new message:",e.data);
				const message=JSON.parse(e.data);

				const {type,data}=message;

				switch (type) {
					case 'receivedNewParticipantNotif':
					case 'chatMessage':

						const chatMessage=data.message;


						// update DOM with message on new chat participant joining and/or new chat message
						const chatMessagesContainer=document.getElementById('chat-messages');
						const newPara=document.createElement('p');

						newPara.textContent=chatMessage;
						chatMessagesContainer.appendChild(newPara);

						break;
					case 'responseCurrentCallParticipants':
						const otherCallParticipants=data.participants;
						const callerText=document.getElementById("username").value;

						otherCallParticipants.forEach(participant => {
							const createdOffer=sendOffer(callerText,participant);
							websocket.send(JSON.stringify(createdOffer))
						});

						// Update DOM to display current participants on call being joined
						const currentParticipantsContainer=document.getElementById('call-participants-list');

						otherCallParticipants.map((participantName) => {
							const newPara=document.createElement('p');

							newPara.textContent=participantName;

							currentParticipantsContainer.appendChild(newPara);
						})

						break;
					case 'offer':
						const {caller,recipient,offer}=data;
						console.log(`Received offer message from user ${caller} `);

						break;
				}
			})


		}

	} catch (err) {
		console.error("An error occurred:",err);
		createCallButton.textContent="Create Call";
	}

}

