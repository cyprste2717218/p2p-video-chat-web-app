
export class TokenService {
	#token=null;

	setToken(newToken) {
		this.#token=newToken;
	}

	getToken() {
		return this.#token;
	}

	clearToken() {
		this.#token=null;
	}
}

const tokenService=new TokenService();
let apiBase="";

onmessage=async function(event) {
	console.log("triggered the token worker");
	const {messageType,requestBody}=event.data;

	switch (messageType) {
		case 'Init':
			apiBase=event.data.apiBase ?? "";
			break;
		case 'ReqLogin':
			const loginResult=await handleLogin(requestBody);
			postMessage(loginResult);
			break;
		case 'ReqSignup':
			const signUpResult=await handleRegister(requestBody);
			postMessage(signUpResult);
			break;
		case 'ReqLogout':
			const logoutResult=await handleLogout();
			postMessage(logoutResult);
			break;
		case 'ReqCreateCall':
			const createCallResult=await handleCreateCall();
			postMessage(createCallResult);
			break;
		case 'ReqJoinCall':
			const joinCallResult=await handleJoinCall(requestBody);
			postMessage(joinCallResult);
			break;
		case 'ReqLeaveCall':
			const leaveCallResult=await handleLeaveCall();
			postMessage(leaveCallResult);
			break;
	}
};

async function handleLogin(requestBody) {

	const resultMessage={message: "",type: "ResLogin"};

	const result=await fetch(`${apiBase}/login`,{
		method: "POST",
		body: JSON.stringify(requestBody),
		headers: {
			"Content-type": "application/json; charset=UTF-8",
		}
	});

	if (result.ok) {
		const dataBody=await result.json();

		const {success,data}=dataBody;

		if (!success) {
			resultMessage.message="Login failed";
			return resultMessage;
		}

		const {token}=data;
		tokenService.setToken(token);

		resultMessage.message="Login Succesful!";
	} else {
		resultMessage.message="Login failed";
	}

	return resultMessage;


}

async function handleRegister(requestBody) {

	const resultMessage={message: "",type: "ResSignup"};

	const result=await fetch(`${apiBase}/signup`,{
		method: "POST",
		body: JSON.stringify(requestBody),
		headers: {
			"Content-type": "application/json; charset=UTF-8"
		}
	});

	if (result.ok) {
		const dataBody=await result.json();

		const {success,data}=dataBody;

		if (!success) {
			resultMessage.message="Signup failed";
			return resultMessage;
		}

		resultMessage.message=data.message;
	} else {
		resultMessage.message="Signup failed";
	}

	return resultMessage;
}

async function handleLogout() {

	const resultMessage={message: "",type: "ResLogout"};

	const result=await fetch(`${apiBase}/logout`,{
		method: "POST",
		headers: {
			"Content-type": "application/json; charset=UTF-8",
			"Authorization": `Bearer ${tokenService.getToken()}`
		}
	});

	if (result.ok) {

		tokenService.clearToken();
		const dataBody=await result.json();

		const {success,data}=dataBody;

		if (!success) {
			resultMessage.message="Logout failed";
			return resultMessage;
		}

		resultMessage.message=data.message;

	} else {
		resultMessage.message="Logout failed";
	}

	return resultMessage;
}

async function handleCreateCall() {


	const resultMessage={message: "",type: "ResCreateCall"};

	const result=await fetch(`${apiBase}/call/create`,{
		method: "POST",
		headers: {
			"Content-type": "application/json; charset=UTF-8",
			"Authorization": `Bearer ${tokenService.getToken()}`
		}
	});

	if (result.ok) {

		const dataBody=await result.json();


		const {success,data}=dataBody;


		if (!success) {
			resultMessage.message="Create new call failed";
			return resultMessage;
		}

		const {callID,callURL}=data;
		resultMessage.message={callID,callURL};

	} else {
		resultMessage.message="Create new call failed";
	}

	return resultMessage;

}

async function handleJoinCall(requestBody) {

	const resultMessage={message: "",type: "ResJoinCall"};
	const callID=requestBody;

	const result=await fetch(`${apiBase}/call/${callID}/join`,{
		method: "PUT",
		headers: {
			"Content-type": "application/json; charset=UTF-8",
			"Authorization": `Bearer ${tokenService.getToken()}`
		}
	});

	if (result.ok) {
		const dataBody=await result.json();

		const {success,data}=dataBody;

		if (!success) {
			resultMessage.message="Join new call failed";
			return resultMessage;
		}

		const {callURL}=data;
		resultMessage.message=callURL;
	} else {
		resultMessage.message="Join new call failed";
	}

	return resultMessage;
}

async function handleLeaveCall() {
	/* To be implemented */
}