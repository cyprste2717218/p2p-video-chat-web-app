import React from "react";
import {Badge} from "@/components/ui/badge";
import {Card} from "@/components/ui/card";

interface RemoteStream {
  peerUser: string;
  stream: MediaStream;
}

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement|null>;
  remoteStreams: RemoteStream[];
}

function VideoTile({label,videoRef,muted=false}: {
  label: string;
  videoRef?: React.RefObject<HTMLVideoElement|null>;
  muted?: boolean;
  stream?: MediaStream;
}) {
  return (
    <Card className="relative overflow-hidden bg-zinc-900 aspect-video flex items-center justify-center min-w-[280px]">
      <video
        ref={videoRef}
        autoPlay
        muted={muted}
        playsInline
        className="w-full h-full object-cover"
      />
      <Badge className="absolute bottom-2 left-2 bg-black/60 text-white border-0">
        {label}
      </Badge>
    </Card>
  );
}

function RemoteTile({peerUser,stream}: RemoteStream) {
  const ref=React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (ref.current) ref.current.srcObject=stream;
  },[stream]);

  return <VideoTile label={peerUser} videoRef={ref} />;
}

export default function VideoGrid({localVideoRef,remoteStreams}: VideoGridProps) {
  return (
    <div className="flex flex-wrap gap-3 w-full">
      <VideoTile label="You" videoRef={localVideoRef} muted />
      {remoteStreams.map((rs) => (
        <RemoteTile key={rs.peerUser} {...rs} />
      ))}
    </div>
  );
}
