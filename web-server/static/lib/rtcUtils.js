let localMedia;

const mediaConstraints = {
	audio: true, // We want an audio track
	video: true, // And we want a video track
};

// Send SDP offer message from caller to recipient over signalling server
export async function sendOffer(caller, recipient) {
	async function createOffer() {
		const peerConnection = createPeerConnection();

		if (!localMedia) {
			throw new Error("No local media currently captured");
		}

		localMedia
			.then((localStream) => {
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

	const createdOffer = await createOffer();

	const message = {
		type: 'offer',
		data: { offer: createdOffer, recipient: recipient, caller: caller }
	}

	return message;
}

// Retrieve and display video from local device on webpage
export async function getLocalMedia() {
	try {

		if (localMedia) {
			throw new Error("Already capturing local media");
		}

		localMedia = navigator.mediaDevices
			.getUserMedia(mediaConstraints)
			.then((localStream) => {
				document.getElementById("local_video").srcObject = localStream;
			});
	} catch (err) {
		console.error("Error retrieving local media (video):", err);
	}
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

