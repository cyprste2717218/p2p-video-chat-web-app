const mediaConstraints = {
	audio: true, // We want an audio track
	video: true, // And we want a video track
};

function sendOffer(caller, recipient) {
	function createOffer() {
		const peerConnection = createPeerConnection();

		navigator.mediaDevices
			.getUserMedia(mediaConstraints)
			.then((localStream) => {
				document.getElementById("local_video").srcObject = localStream;
				localStream
					.getTracks()
					.forEach((track) => peerConnection.addTrack(track, localStream));
			})
			.catch(handleGetUserMediaError);


		peerConnection.createOffer()
			.then(() => {
				peerConnection.setLocalDescription()
			})

		return peerConnection;
	}

	const createdOffer = createOffer();

	const message = {
		type: 'offer',
		data: { offer: createdOffer, recipient: recipient, caller: caller }
	}

	return message;
}





function createPeerConnection() {
	const myPeerConnection = new RTCPeerConnection({
		iceServers: [
			{
				urls: "stun:stun.stunprotocol.org",
			},
		],
	});

	myPeerConnection.onicecandidate = handleICECandidateEvent;
	myPeerConnection.ontrack = handleTrackEvent;
	myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
	myPeerConnection.onremovetrack = handleRemoveTrackEvent;
	myPeerConnection.oniceconnectionstatechange =
		handleICEConnectionStateChangeEvent;
	myPeerConnection.onicegatheringstatechange =
		handleICEGatheringStateChangeEvent;
	myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;

	return myPeerConnection;
}

