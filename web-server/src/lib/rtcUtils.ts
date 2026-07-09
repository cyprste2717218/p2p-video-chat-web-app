let localMedia: Promise<MediaStream>|null=null;
const peerConnectionsArr: ExtendedRTCPeerConnection[]=[];
let websocket: WebSocket|null=null;

const mediaConstraints={audio: true,video: true};
const otherCallParticipants: string[]=[];

interface ExtendedRTCPeerConnection extends RTCPeerConnection {
  caller?: string;
  recipient?: string;
  peerUser?: string;
}

type AddRemoteVideoFn=(peerUser: string,stream: MediaStream) => void;

function sendMsg(message: object) {
  if (websocket) return websocket.send(JSON.stringify(message));
  console.error("No active websocket connection to send message through");
}

function createPeerConnection(
  caller: string,
  recipient: string,
  peerUser: string,
  callID: string,
  addRemoteVideo: AddRemoteVideoFn,
  remoteVideoRefs: React.RefObject<HTMLVideoElement[]|null>,
): ExtendedRTCPeerConnection {
  const myPeerConnection: ExtendedRTCPeerConnection=new RTCPeerConnection({
    iceServers: [{urls: "stun:stun.stunprotocol.org"}],
  });

  myPeerConnection.caller=caller;
  myPeerConnection.recipient=recipient;
  myPeerConnection.peerUser=peerUser;

  myPeerConnection.onicecandidate=(event) => {
    if (!event.candidate||event.candidate.candidate==="") return;
    sendMsg({type: "candidate",data: {candidate: event.candidate,recipient,caller,callID}});
  };

  myPeerConnection.ontrack=(event) => {
    const existing=document.getElementById(`video-from-${peerUser}`);
    if (!existing) {
      addRemoteVideo(peerUser,event.streams[0]);

    }
  };

  myPeerConnection.onnegotiationneeded=() => console.log("Negotiation needed");
  myPeerConnection.oniceconnectionstatechange=() => console.log("ICE connection state change");
  myPeerConnection.onicegatheringstatechange=() => console.log("ICE gathering state change");
  myPeerConnection.onsignalingstatechange=() => console.log("Signalling state change");

  return myPeerConnection;
}

function isExistingPeerConnection(
  type: string,
  caller: string,
  recipient: string,
  callID: string,
  addRemoteVideo: AddRemoteVideoFn,
  remoteVideoRefs: React.RefObject<HTMLVideoElement[]|null>,
): {currentPeerConnection: ExtendedRTCPeerConnection; peerConnectionIndex: number} {
  let peerConnectionIndex=peerConnectionsArr.findIndex(
    (pc) => (pc as ExtendedRTCPeerConnection).recipient===recipient&&
      (pc as ExtendedRTCPeerConnection).caller===caller
  );

  if (peerConnectionIndex!==-1) {
    return {currentPeerConnection: peerConnectionsArr[peerConnectionIndex] as ExtendedRTCPeerConnection,peerConnectionIndex};
  }

  if (!(type==="sendingOffer"||type==="receivingOffer")) {
    throw new Error("RTC connection obj should already exist");
  }

  const peerUser=type==="sendingOffer"? recipient:caller;
  const newPeerConnection=createPeerConnection(caller,recipient,peerUser,callID,addRemoteVideo,remoteVideoRefs);
  peerConnectionsArr.push(newPeerConnection);
  peerConnectionIndex=peerConnectionsArr.length-1;

  return {currentPeerConnection: newPeerConnection,peerConnectionIndex};
}

export async function sendOffer(
  currentUserEmail: string,
  caller: string,
  recipient: string,
  callID: string,
  remoteVideoRefs: React.RefObject<HTMLVideoElement[]|null>,
  addRemoteVideo: AddRemoteVideoFn
) {
  const {currentPeerConnection,peerConnectionIndex}=isExistingPeerConnection(
    "sendingOffer",caller,recipient,callID,addRemoteVideo,remoteVideoRefs
  );

  if (!localMedia) throw new Error("No local media currently captured");

  await localMedia.then((localStream) => {
    localStream.getTracks().forEach((track) => currentPeerConnection.addTrack(track,localStream));
  });

  await currentPeerConnection.createOffer().then(async (offer) => {
    await currentPeerConnection.setLocalDescription(offer);
  });

  peerConnectionsArr[peerConnectionIndex]=currentPeerConnection;

  if (!currentPeerConnection.localDescription) throw new Error("No localDescription set");

  return {
    type: "offer",
    data: {offer: currentPeerConnection.localDescription,recipient,caller,callID,currentUserEmail},
  };
}

export async function getLocalMedia(localVideoRef: React.RefObject<HTMLVideoElement|null>) {
  if (localMedia) throw new Error("Already capturing local media");
  localMedia=navigator.mediaDevices.getUserMedia(mediaConstraints).then((localStream) => {
    if (localVideoRef.current) localVideoRef.current.srcObject=localStream;
    return localStream;
  });
}

export async function establishWebSocketServerConn(callURL: string) {
  websocket=new WebSocket(callURL);
}

export async function attachWSConnListeners(
  callerEmail: string,
  remoteVideoRefs: React.RefObject<HTMLVideoElement[]|null>,
  addChatMessage: (msg: string) => void,
  addParticipant: (name: string) => void,
  addRemoteVideo: AddRemoteVideoFn
) {
  if (!websocket) return console.error("No active websocket connection configured");

  websocket.addEventListener("message",async (e) => {
    const {type,data}=JSON.parse(e.data);

    switch (type) {
      case "receivedNewParticipantNotif":
      case "chatMessage":
        addChatMessage(`${data.email}: ${data.message}`);
        break;

      case "responseCurrentCallParticipants": {
        const {participants,callID,currentUserEmail}=data;
        if (participants.length>0) {
          participants.forEach((p: string) => {
            otherCallParticipants.push(p);
            addParticipant(p);
          });
          for (const participant of otherCallParticipants) {
            const offer=await sendOffer(currentUserEmail,callerEmail,participant,callID,remoteVideoRefs,addRemoteVideo);
            sendMsg(offer);
          }
        }
        break;
      }

      case "offer": {
        const {currentUserEmail,caller,recipient,offer,callID}=data;
        const {currentPeerConnection,peerConnectionIndex}=isExistingPeerConnection(
          "receivingOffer",caller,recipient,callID,addRemoteVideo,remoteVideoRefs
        );
        await currentPeerConnection.setRemoteDescription({type: offer.type,sdp: offer.sdp});
        if (!localMedia) throw new Error("No local media currently captured");
        await localMedia.then((localStream) => {
          localStream.getTracks().forEach((track) => currentPeerConnection.addTrack(track,localStream));
        });
        await currentPeerConnection.createAnswer().then(async (answer) => {
          await currentPeerConnection.setLocalDescription(answer);
        });
        peerConnectionsArr[peerConnectionIndex]=currentPeerConnection;
        sendMsg({type: "answer",data: {caller,recipient,answer: currentPeerConnection.localDescription,callID}});
        break;
      }

      case "answer": {
        const {caller,recipient,answer,callID}=data;
        const {currentPeerConnection,peerConnectionIndex}=isExistingPeerConnection(
          "receivingAnswer",caller,recipient,callID,addRemoteVideo,remoteVideoRefs
        );
        await currentPeerConnection.setRemoteDescription({type: answer.type,sdp: answer.sdp});
        peerConnectionsArr[peerConnectionIndex]=currentPeerConnection;
        break;
      }

      case "candidate": {
        const {candidate,recipient}=data;
        const idx=peerConnectionsArr.findIndex(
          (pc) => (pc as ExtendedRTCPeerConnection).recipient===recipient
        );
        if (peerConnectionsArr[idx]) {
          peerConnectionsArr[idx].addIceCandidate(new RTCIceCandidate(candidate));
        }
        break;
      }
    }
  });
}

export function sendJoiningMessage(usernameInput: string,emailInput: string,callID: string) {
  if (!websocket) return;
  websocket.addEventListener("open",() => {
    sendMsg({type: "newParticipantOnCall",data: {username: usernameInput,email: emailInput,callID}});
  });
}

export function sendChatMessageToCall(message: string,callID: string,emailInput: string) {
  if (!websocket) return;
  sendMsg({type: "chatMessage",data: {email: emailInput,message,callID}});
}

export async function connectToCall(
  callURL: string,
  callID: string,
  email: string,
  username: string,
  localVideoRef: React.RefObject<HTMLVideoElement|null>,
  remoteVideoRefs: React.RefObject<HTMLVideoElement[]|null>,
  addChatMessage: (msg: string) => void,
  addParticipant: (name: string) => void,
  addRemoteVideo: AddRemoteVideoFn
) {
  await getLocalMedia(localVideoRef);
  await establishWebSocketServerConn(callURL);
  await attachWSConnListeners(email,remoteVideoRefs,addChatMessage,addParticipant,addRemoteVideo,);
  sendJoiningMessage(username,email,callID);
}

export async function closeConns(
  remoteVideoRefs: React.RefObject<HTMLVideoElement[]|[]>,
  updateRemoteVideo: (peerUser: string,stream: MediaStream) => void,
  getRemoteVideo: (peerUser: string) => {peerUser: string; stream: MediaStream;}|undefined) {
  async function handleClosePeerConn(pc: ExtendedRTCPeerConnection) {
    pc.ontrack=null;
    pc.onicecandidate=null;
    pc.oniceconnectionstatechange=null;
    pc.onsignalingstatechange=null;
    pc.onicegatheringstatechange=null;
    pc.onnegotiationneeded=null;

  }

  async function handleCloseVideoElem(peerUser: string) {

    const remoteVideo=getRemoteVideo(peerUser);

    if (!remoteVideo) {
      throw new Error(`Can't find video element to close for peer ${peerUser}`);
    }

    const {stream}=remoteVideo;

    const closedStream=stream;

    if (!closedStream) {
      throw new Error(`Can't find video element to close for peer ${peerUser}`);
    }

    closedStream.getTracks().forEach((track) => track.stop());
    updateRemoteVideo(peerUser,closedStream);

  }

  peerConnectionsArr.forEach(async (pc) => {
    const peerUser=pc.peerUser;
    if (!peerUser) {
      throw new Error("no peerUser defined");
    }

    await handleClosePeerConn(pc);
    await handleCloseVideoElem(peerUser);

    pc.close();
  });

  peerConnectionsArr.length=0;
}
