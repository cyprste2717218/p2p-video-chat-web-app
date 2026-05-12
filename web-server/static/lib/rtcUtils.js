let myPeerConnection;

const mediaConstraints = {
	audio: true, // We want an audio track
	video: true, // And we want a video track
};


function connectToParticipant(participant) {
	if (myPeerConnection) {
		alert("You can't start a call because you already have one open!");
	} else {

		createPeerConnection();

		navigator.mediaDevices
			.getUserMedia(mediaConstraints)
			.then((localStream) => {
				document.getElementById("local_video").srcObject = localStream;
				localStream
					.getTracks()
					.forEach((track) => myPeerConnection.addTrack(track, localStream));
			})
			.catch(handleGetUserMediaError);
	}
}

function createPeerConnection() {
	myPeerConnection = new RTCPeerConnection({
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
}

