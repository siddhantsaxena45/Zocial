import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  VideoIcon,
  PhoneOff,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Repeat,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setActiveCall, setIncomingCall, resetCall, toggleMute, toggleCamera } from "@/redux/callSlice";

const GlobalCallManager = () => {
  const dispatch = useDispatch();
  const { incomingCall, callerInfo, activeCall, isMuted, isCameraOff } = useSelector((state) => state.call);
  const { socket } = useSelector((state) => state.socketio);
  const { user: loggedInUser, selectedUser } = useSelector((state) => state.auth);

  const [facingMode, setFacingMode] = useState("user");
  const [loading, setLoading] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const iceCandidatesBuffer = useRef([]);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  const endCall = (shouldNotifyOther = true) => {
    if (shouldNotifyOther && socket && (selectedUser?._id || callerInfo?.from)) {
      const targetUserId = selectedUser?._id || callerInfo?.from;
      socket.emit("call-ended", { to: targetUserId });
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    dispatch(resetCall());
    iceCandidatesBuffer.current = [];
  };

  const startCall = async () => {
    if (activeCall || loading || !selectedUser?._id) return;
    setLoading(true);
    try {
      dispatch(setActiveCall(true));
      localStream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;

      const pc = new RTCPeerConnection(iceServers);
      localStream.current.getTracks().forEach((track) => pc.addTrack(track, localStream.current));

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) remoteVideoRef.current.srcObject = e.streams[0];
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) {
          socket.emit("ice-candidate", { to: selectedUser._id, candidate: e.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("video-offer", { to: selectedUser._id, offer: pc.localDescription, userDetails: loggedInUser });

      peerConnection.current = pc;
    } catch (err) {
      console.error("Error starting call:", err);
      endCall(false);
    } finally {
      setLoading(false);
    }
  };

  const acceptCall = async () => {
    if (!callerInfo) return;
    dispatch(setActiveCall(true));
    try {
      const { from, offer } = callerInfo;
      localStream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;

      const pc = new RTCPeerConnection(iceServers);
      localStream.current.getTracks().forEach((track) => pc.addTrack(track, localStream.current));

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) remoteVideoRef.current.srcObject = e.streams[0];
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) socket.emit("ice-candidate", { to: from, candidate: e.candidate });
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      for (const candidate of iceCandidatesBuffer.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      iceCandidatesBuffer.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("video-answer", { to: from, answer });

      peerConnection.current = pc;
    } catch (err) {
      console.error("Error accepting call:", err);
      endCall(false);
    }
  };

  const rejectCall = () => {
    if (callerInfo?.from && socket) socket.emit("call-rejected", { to: callerInfo.from });
    dispatch(resetCall());
  };

  useEffect(() => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  useEffect(() => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach((track) => {
        track.enabled = !isCameraOff;
      });
    }
  }, [isCameraOff]);

  useEffect(() => {
    if (!socket) return;
    const handleVideoAnswer = async ({ answer }) => {
      if (!peerConnection.current) return;
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    };
    const handleIceCandidate = async ({ candidate }) => {
      if (peerConnection.current?.remoteDescription?.type) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        iceCandidatesBuffer.current.push(candidate);
      }
    };
    socket.on("video-answer", handleVideoAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    return () => {
      socket.off("video-answer", handleVideoAnswer);
      socket.off("ice-candidate", handleIceCandidate);
    };
  }, [socket]);

  // Listen for the "Start Call" command from the UI
  useEffect(() => {
    const handleInitiateCall = () => startCall();
    window.addEventListener("initiate-video-call", handleInitiateCall);
    return () => window.removeEventListener("initiate-video-call", handleInitiateCall);
  }, [selectedUser, socket, activeCall, loading, loggedInUser]);

  return (
    <>
      {incomingCall && !activeCall && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm bg-white border border-indigo-100 shadow-2xl rounded-2xl p-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <VideoIcon className="h-6 w-6 animate-pulse" />
            </div>
            <div className="flex-1 flex flex-col">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Incoming Intelligence Call</p>
                <p className="text-sm font-bold text-slate-900">{callerInfo?.userDetails?.username || "Professional Partner"}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={acceptCall} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl h-10">ACCEPT</Button>
            <Button onClick={rejectCall} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold rounded-xl h-10">REJECT</Button>
          </div>
        </div>
      )}

      <Dialog open={activeCall} onOpenChange={(val) => !val && endCall(true)}>
        <DialogContent className="w-full max-w-2xl p-6 bg-slate-900 border-none text-white rounded-3xl overflow-hidden z-[9999]">
          <DialogHeader className="hidden">
            <DialogTitle>Active Video Session</DialogTitle>
            <DialogDescription>Interactive video and audio communication interface.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[300px] sm:h-[400px]">
            <div className="relative rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <span className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">You</span>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shadow-2xl shadow-indigo-500/10">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <span className="absolute bottom-3 left-3 bg-indigo-600/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">Partner</span>
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-4">
            <Button onClick={() => endCall(true)} className="h-14 w-14 bg-red-600 hover:bg-red-700 rounded-2xl shadow-xl shadow-red-200"><PhoneOff className="h-6 w-6" /></Button>
            <Button onClick={() => dispatch(toggleMute())} className={`h-14 w-14 rounded-2xl transition-all ${isMuted ? 'bg-amber-100 text-amber-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>{isMuted ? <MicOff /> : <Mic />}</Button>
            <Button onClick={() => dispatch(toggleCamera())} className={`h-14 w-14 rounded-2xl transition-all ${isCameraOff ? 'bg-amber-100 text-amber-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>{isCameraOff ? <CameraOff /> : <Camera />}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalCallManager;
