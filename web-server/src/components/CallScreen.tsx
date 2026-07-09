import React,{useRef,useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {useTokenWorker} from "@/lib/useTokenWorker";
import {connectToCall,sendChatMessageToCall,closeConns,closeWebSocketServerConn} from "@/lib/rtcUtils";
import VideoGrid from "@/components/VideoGrid";
import ChatPanel from "@/components/ChatPanel";
import {PhoneOff,Video,LogOut} from "lucide-react";

interface RemoteStream {peerUser: string; stream: MediaStream;}

interface CallScreenProps {
  email: string;
  username: string;
  onLogout: () => void;
}

export default function CallScreen({email,username,onLogout}: CallScreenProps) {
  const {createCall,joinCall,leaveCall,logout}=useTokenWorker();
  const localVideoRef=useRef<HTMLVideoElement>(null);
  const remoteVideoRefs=useRef<HTMLVideoElement[]|[]>([]);

  const [activeCallID,setActiveCallID]=useState<string|null>(null);
  const [joinInput,setJoinInput]=useState("");
  const [messages,setMessages]=useState<string[]>([]);
  const [participants,setParticipants]=useState<string[]>([]);
  const [remoteStreams,setRemoteStreams]=useState<RemoteStream[]>([]);
  const [loading,setLoading]=useState<"create"|"join"|null>(null);
  const [error,setError]=useState("");

  function addChatMessage(msg: string) {setMessages((prev) => [...prev,msg]);}
  function addParticipant(name: string) {setParticipants((prev) => [...prev,name]);}
  function addRemoteVideo(peerUser: string,stream: MediaStream) {
    setRemoteStreams((prev) => {
      if (prev.find((s) => s.peerUser===peerUser)) return prev;
      return [...prev,{peerUser,stream}];
    });
  }
  function updateRemoteVideo(peerUser: string,stream: MediaStream) {
    setRemoteStreams((prev) => {
      return prev.map((s) => (s.peerUser===peerUser? s:{peerUser,stream}));
    });
  }
  function getRemoteVideo(peerUser: string) {
    return remoteStreams.find((s) => s.peerUser===peerUser);
  };

  async function handleCreate() {
    setError("");
    setLoading("create");
    try {
      const result=await createCall();
      console.log("result of createCall:",result);
      if ((result as unknown)==="Create new call failed") throw new Error("Create new call failed");
      const {callID,callURL}=result;
      setActiveCallID(callID);
      await connectToCall(callURL,callID,email,username,localVideoRef,remoteVideoRefs,addChatMessage,addParticipant,addRemoteVideo);
    } catch {
      setError("Failed to create call.");
    } finally {
      setLoading(null);
    }
  }

  async function handleJoin() {
    if (!joinInput.trim()) return;
    setError("");
    setLoading("join");
    try {
      const callURL=await joinCall(joinInput.trim());
      if (callURL==="Join new call failed") throw new Error("Join new call failed");
      setActiveCallID(joinInput.trim());
      await connectToCall(callURL as string,joinInput.trim(),email,username,localVideoRef,remoteVideoRefs,addChatMessage,addParticipant,addRemoteVideo);
    } catch {
      setError("Failed to join call. Check the call ID.");
    } finally {
      setLoading(null);
    }
  }

  async function handleLeave() {

    setError("");
    setLoading("create");


    try {

      if (!activeCallID) {
        throw new Error("Can't access active callID")
      }

      await leaveCall(activeCallID);
      await closeWebSocketServerConn(activeCallID);
      await closeConns(remoteVideoRefs,updateRemoteVideo,getRemoteVideo);

      setActiveCallID(null);
      setRemoteStreams([]);
      setParticipants([]);
      setMessages([]);

    } catch (err) {
      setError("Failed to leave call. Please try again:");
      console.error(err);
    } finally {
      setLoading(null);
    }



  }

  async function handleLogout() {
    await logout();
    onLogout();
  }

  const inCall=Boolean(activeCallID);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-zinc-300" />
          <span className="font-semibold text-zinc-100">Voneo</span>
        </div>
        <div className="flex items-center gap-3">
          {activeCallID&&(
            <Badge variant="outline" className="border-zinc-600 text-zinc-300 font-mono text-xs">
              {activeCallID}
            </Badge>
          )}
          <span className="text-sm text-zinc-400">{username}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Logout
          </Button>
        </div>
      </header>

      {/* Controls bar — hidden once in a call */}
      {!inCall&&(
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-zinc-800">
          <Button
            onClick={handleCreate}
            disabled={loading!==null}
            className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          >
            {loading==="create"? "Creating…":"Create Call"}
          </Button>

          <Separator orientation="vertical" className="h-6 bg-zinc-700" />

          <div className="flex gap-2">
            <Input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="Enter call ID"
              className="w-64 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600"
              suppressHydrationWarning={true}
            />
            <Button
              onClick={handleJoin}
              disabled={loading!==null||!joinInput.trim()}
              variant="outline"
              className="border-zinc-700 text-zinc-900 hover:bg-zinc-800"
            >
              {loading==="join"? "Joining…":"Join Call"}
            </Button>
          </div>

          {error&&<p className="text-sm text-red-400 w-full">{error}</p>}
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 p-6 overflow-y-auto">
          {inCall&&(
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-zinc-600 text-zinc-300 font-mono text-xs">
                Call ID: {activeCallID}
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLeave}
              >
                <PhoneOff className="h-4 w-4 mr-1.5" />
                Hang Up
              </Button>
            </div>
          )}
          <VideoGrid localVideoRef={localVideoRef} remoteStreams={remoteStreams} />
        </div>

        {/* Chat sidebar */}
        <div className="w-80 shrink-0 border-l border-zinc-800 flex flex-col">
          <ChatPanel
            messages={messages}
            participants={participants}
            onSend={(msg) => activeCallID&&sendChatMessageToCall(msg,activeCallID,email)}
          />
        </div>
      </div>
    </div>
  );
}
