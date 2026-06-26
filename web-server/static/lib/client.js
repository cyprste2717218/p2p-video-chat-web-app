import {getLocalMedia,sendOffer,establishWebSocketServerConn,sendJoiningMessage,attachWSConnListeners} from "./rtcUtils.js";

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
			password: passwordInput.value,
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

async function connectToCall() {

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

		// set up ws event handlers to respond to messages receieved
		await attachWSConnListeners(emailInput.value);

		// start connection negotiation process with any current call participants
		sendJoiningMessage(usernameInput.value,emailInput.value,callID);

		// display currrent call ID connected to in UI
		const currentcallIDDisplay=document.getElementById("current-call-id-display");
		currentcallIDDisplay.textContent=callID;

		// reset join call button to default text after connection established
		joinCallButton.textContent="Join Call";




	} catch (err) {
		joinCallButton.textContent="Join Call";
		console.error("An error occurred:",err);
	}
}

function hangUpCall() {
	/* To be implemented */
}

async function createCall() {

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

		// set up ws event handlers to respond to messages receieved
		await attachWSConnListeners(emailInput.value);

		// start connection negotiation process with any current call participants
		sendJoiningMessage(usernameInput.value,emailInput.value,callID);

	} catch (err) {
		console.error("An error occurred:",err);
		createCallButton.textContent="Create Call";
	}

}

