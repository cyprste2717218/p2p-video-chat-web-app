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

const tokenService=TokenService();

onmessage=async function(event) {

	const {messageType,requestBody}=event.data;

	switch (messageType) {
		case 'login':
			const loginResult=await handleLogin(requestBody);
			postMessage(loginResult);
			break;
		case 'signup':
			const signUpResult=await handleRegister(requestBody);
			postMessage(signUpResult);
			break;
		case 'logout':
			const logoutResult=await handleLogout();
			postMessage(logoutResult);
			break;
		case 'createCall':
			const createCallResult=await handleCreateCall();
			postMessage(createCallResult);
			break;
		case 'joinCall':
			const joinCallResult=await handleJoinCall();
			postMessage(joinCallResult);
			break;
		case 'leaveCall':
			const leaveCallResult=await handleLeaveCall();
			postMessage(leaveCallResult);
			break;
	}
};

async function handleLogin(requestBody) {

	const resultMessage={message: ""};

	const result=await fetch(`http://localhost:3000/login`,{
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

	const resultMessage={message: ""};

	const result=await fetch(`http://localhost:3000/signup`,{
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

	const resultMessage={message: ""};

	const result=await fetch(`http://localhost:3000/logout`,{
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


	const resultMessage={message: ""};

	const result=await fetch("http://localhost:3000/call/create",{
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

async function handleJoinCall() {

	const resultMessage={message: ""};

	const result=await fetch(`http://localhost:3000/call/${callID}/join`,{
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
			resultMessage.message="Create new call failed";
			return resultMessage;
		}

		const {callURL}=data;
		resultMessage.message=callURL;
	} else {
		resultMessage.message="Create new call failed";
	}

	return resultMessage;
}

async function handleLeaveCall() {
	/* To be implemented */
}