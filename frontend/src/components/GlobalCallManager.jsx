import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
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
  Code,
  Paintbrush,
  Eraser,
  Trash2,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setActiveCall, setIncomingCall, resetCall, toggleMute, toggleCamera } from "@/redux/callSlice";

class RingtoneSynth {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.timeout = null;
    this.osc1 = null;
    this.osc2 = null;
    this.gain = null;
  }
  
  play() {
    if (this.isPlaying) return Promise.resolve();
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
      this.gain.gain.value = 0;
      
      this.osc1 = this.ctx.createOscillator();
      this.osc2 = this.ctx.createOscillator();
      this.osc1.type = 'square';
      this.osc2.type = 'square';
      this.osc1.frequency.value = 440;
      this.osc2.frequency.value = 480;
      
      this.osc1.connect(this.gain);
      this.osc2.connect(this.gain);
      this.osc1.start();
      this.osc2.start();
      
      this.isPlaying = true;
      
      const ring = () => {
        if (!this.isPlaying) return;
        const now = this.ctx.currentTime;
        this.gain.gain.setValueAtTime(0, now);
        this.gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
        this.gain.gain.setValueAtTime(0.05, now + 1.5);
        this.gain.gain.linearRampToValueAtTime(0, now + 1.6);
        this.timeout = setTimeout(ring, 3000);
      };
      ring();
      return Promise.resolve();
    } catch(e) {
      console.warn("AudioContext blocked", e);
      return Promise.reject(e);
    }
  }

  pause() {
    this.isPlaying = false;
    clearTimeout(this.timeout);
    if (this.gain && this.ctx) {
      this.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
      setTimeout(() => {
        if (this.osc1) { this.osc1.stop(); this.osc1.disconnect(); }
        if (this.osc2) { this.osc2.stop(); this.osc2.disconnect(); }
        if (this.ctx) { this.ctx.close(); }
        this.ctx = null;
      }, 200);
    }
  }
}

const GlobalCallManager = () => {
  const dispatch = useDispatch();
  const { incomingCall, callerInfo, activeCall, isMuted, isCameraOff } = useSelector((state) => state.call);
  const { socket } = useSelector((state) => state.socketio);
  const { user: loggedInUser, selectedUser } = useSelector((state) => state.auth);

  const [facingMode, setFacingMode] = useState("user");
  const [loading, setLoading] = useState(false);
  const [isCallAccepted, setIsCallAccepted] = useState(false);

  // Technical Pair-Programming & Whiteboard State
  const [callMode, setCallMode] = useState("video"); // 'video', 'pair_code', 'whiteboard'
  const [pairCode, setPairCode] = useState("");
  const [pairLanguage, setPairLanguage] = useState("javascript");
  const [copiedCode, setCopiedCode] = useState(false);
  const [brushColor, setBrushColor] = useState("#6366f1");
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const whiteboardHistory = useRef([]);
  const callPartnerId = useRef(null);

  const isCallAcceptedRef = useRef(false);
  const incomingCallRef = useRef(false);
  const callerInfoRef = useRef(null);

  useEffect(() => {
    isCallAcceptedRef.current = isCallAccepted;
  }, [isCallAccepted]);
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);
  useEffect(() => {
    callerInfoRef.current = callerInfo;
  }, [callerInfo]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const [remoteStreamState, setRemoteStreamState] = useState(null);
  const iceCandidatesBuffer = useRef([]);
  const ringtoneAudio = useRef(null);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
      {
        urls: [
          "turn:openrelay.metered.ca:80",
          "turn:openrelay.metered.ca:443",
          "turn:openrelay.metered.ca:443?transport=tcp"
        ],
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ],
    iceCandidatePoolSize: 10
  };

  const endCall = (shouldNotifyOther = true) => {
    const targetUserId = callPartnerId.current || selectedUser?._id || callerInfo?.from;

    if (shouldNotifyOther && socket && targetUserId) {
      socket.emit("call-ended", { to: targetUserId });

      // If caller ended before recipient accepted, record missed call for recipient
      if (!isCallAccepted && activeCall && !incomingCall) {
        socket.emit("missed-call", { to: targetUserId });
        axios.post(`${import.meta.env.VITE_API_URL}/notification/missed-call/${targetUserId}`, {}, { withCredentials: true }).catch(() => {});
      }
    }

    if (peerConnection.current) {
      try {
        peerConnection.current.onconnectionstatechange = null;
        peerConnection.current.oniceconnectionstatechange = null;
        peerConnection.current.ontrack = null;
        peerConnection.current.onicecandidate = null;
        peerConnection.current.close();
      } catch (e) {
        console.error("Error closing peer connection:", e);
      }
      peerConnection.current = null;
    }

    if (localStream.current) {
      try {
        localStream.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      localStream.current = null;
    }

    if (remoteStream.current) {
      try {
        remoteStream.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      remoteStream.current = null;
    }

    setRemoteStreamState(null);
    callPartnerId.current = null;
    whiteboardHistory.current = [];
    setPairCode("");

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    if (ringtoneAudio.current) {
      ringtoneAudio.current.pause();
    }

    dispatch(resetCall());
    iceCandidatesBuffer.current = [];
    setIsCallAccepted(false);
    setCallMode("video");
  };

  const setLocalVideo = (el) => {
    localVideoRef.current = el;
    if (el && localStream.current) {
      if (el.srcObject !== localStream.current) {
        el.srcObject = localStream.current;
      }
      el.play().catch(() => {});
    }
  };

  const setRemoteVideo = (el) => {
    remoteVideoRef.current = el;
    const currentRemote = remoteStream.current || remoteStreamState;
    if (el && currentRemote) {
      if (el.srcObject !== currentRemote) {
        el.srcObject = currentRemote;
      }
      el.play().catch(() => {});
    }
  };

  const setupPeerConnectionEvents = (pc) => {
    pc.onconnectionstatechange = () => {
      console.log("WebRTC connectionState:", pc.connectionState);
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        toast.info("Call disconnected");
        endCall(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("WebRTC iceConnectionState:", pc.iceConnectionState);
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        toast.info("Connection terminated");
        endCall(false);
      }
    };

    pc.ontrack = (e) => {
      console.log("WebRTC ontrack event received track kind:", e.track?.kind);
      if (!remoteStream.current) {
        remoteStream.current = new MediaStream();
      }
      if (e.streams && e.streams[0]) {
        e.streams[0].getTracks().forEach((track) => {
          if (!remoteStream.current.getTracks().some((t) => t.id === track.id)) {
            remoteStream.current.addTrack(track);
          }
        });
      } else if (e.track) {
        if (!remoteStream.current.getTracks().some((t) => t.id === e.track.id)) {
          remoteStream.current.addTrack(e.track);
        }
      }

      setRemoteStreamState(remoteStream.current);

      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream.current) {
        remoteAudioRef.current.srcObject = remoteStream.current;
        remoteAudioRef.current.play().catch(() => {});
      }

      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream.current) {
        remoteVideoRef.current.srcObject = remoteStream.current;
        remoteVideoRef.current.play().catch(() => {});
      }
    };
  };

  const startCall = async (overrideTarget = null) => {
    const target = overrideTarget || selectedUser;
    if (activeCall || loading) return;
    if (!target?._id) {
      toast.error("Please open a conversation to start video call");
      return;
    }

    callPartnerId.current = target._id;
    setPairCode(""); // Always empty on new call
    setCallMode("video");
    whiteboardHistory.current = [];

    // Verify mutual connection before establishing video call
    const isMutualFollow =
      (loggedInUser?.following || []).some(id => String(id?._id || id) === String(target._id)) &&
      (loggedInUser?.followers || []).some(id => String(id?._id || id) === String(target._id));

    if (!isMutualFollow) {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/user/synergy/status/${target._id}`,
          { withCredentials: true }
        );
        if (res.data?.status !== "accepted") {
          toast.error("Video calls are only available between connected peers. Send a synergy request first!");
          return;
        }
      } catch (e) {
        // Fallback safety
      }
    }

    setLoading(true);
    try {
      dispatch(setActiveCall(true));
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
        localVideoRef.current.play().catch(() => {});
      }

      const pc = new RTCPeerConnection(iceServers);
      peerConnection.current = pc;
      setupPeerConnectionEvents(pc);

      localStream.current.getTracks().forEach((track) => pc.addTrack(track, localStream.current));

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) {
          socket.emit("ice-candidate", { to: target._id, candidate: e.candidate });
        }
      };

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      socket.emit("video-offer", { to: target._id, offer: pc.localDescription, userDetails: loggedInUser });
    } catch (err) {
      console.error("Error starting call:", err);
      toast.error(err.message || "Camera/microphone access required for video call");
      endCall(false);
    } finally {
      setLoading(false);
    }
  };

  const acceptCall = async () => {
    if (!callerInfo) return;
    dispatch(setActiveCall(true));
    setPairCode(""); // Always empty on new call
    setCallMode("video");
    whiteboardHistory.current = [];

    try {
      const { from, offer } = callerInfo;
      callPartnerId.current = from;
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
        localVideoRef.current.play().catch(() => {});
      }

      const pc = new RTCPeerConnection(iceServers);
      peerConnection.current = pc;
      setupPeerConnectionEvents(pc);

      localStream.current.getTracks().forEach((track) => pc.addTrack(track, localStream.current));

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) socket.emit("ice-candidate", { to: from, candidate: e.candidate });
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      while (iceCandidatesBuffer.current.length > 0) {
        const candidate = iceCandidatesBuffer.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding buffered candidate:", e);
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("video-answer", { to: from, answer });

      setIsCallAccepted(true);
    } catch (err) {
      console.error("Error accepting call:", err);
      endCall(false);
    }
  };

  // Re-attach video stream elements whenever switching modes, opening call dialog, or stream updates
  useEffect(() => {
    const attachStreams = () => {
      if (localVideoRef.current && localStream.current) {
        if (localVideoRef.current.srcObject !== localStream.current) {
          localVideoRef.current.srcObject = localStream.current;
        }
        localVideoRef.current.play().catch(() => {});
      }
      const currentRemote = remoteStream.current || remoteStreamState;
      if (remoteVideoRef.current && currentRemote) {
        if (remoteVideoRef.current.srcObject !== currentRemote) {
          remoteVideoRef.current.srcObject = currentRemote;
        }
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current && currentRemote) {
        if (remoteAudioRef.current.srcObject !== currentRemote) {
          remoteAudioRef.current.srcObject = currentRemote;
        }
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    attachStreams();
    const frameId = requestAnimationFrame(attachStreams);
    const timeoutId = setTimeout(attachStreams, 250);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
    };
  }, [callMode, activeCall, isCallAccepted, remoteStreamState]);

  const rejectCall = () => {
    if (callerInfo?.from) {
      if (socket) {
        socket.emit("call-rejected", { to: callerInfo.from });
      }
      if (loggedInUser?._id) {
        axios.post(`${import.meta.env.VITE_API_URL}/notification/missed-call/${loggedInUser._id}`, {}, { withCredentials: true }).catch(() => {});
      }
    }
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
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        while (iceCandidatesBuffer.current.length > 0) {
          const candidate = iceCandidatesBuffer.current.shift();
          try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("Error adding buffered candidate on answer:", e);
          }
        }
        setIsCallAccepted(true);
      } catch (err) {
        console.error("Error handling video answer:", err);
      }
    };
    const handleIceCandidate = async ({ candidate }) => {
      if (!candidate) return;
      if (peerConnection.current && peerConnection.current.remoteDescription && peerConnection.current.remoteDescription.type) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ICE candidate:", e);
        }
      } else {
        iceCandidatesBuffer.current.push(candidate);
      }
    };
    const handlePairCodeUpdate = ({ code, language }) => {
      setPairCode(code);
      if (language) setPairLanguage(language);
    };

    const handleWhiteboardDraw = ({ drawData }) => {
      whiteboardHistory.current.push(drawData);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      drawStrokeOnCanvas(ctx, drawData);
    };

    const handleWhiteboardClear = () => {
      whiteboardHistory.current = [];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const handleCallModeUpdate = ({ mode }) => {
      if (mode) {
        setCallMode(mode);
        const modeLabel = 
          mode === "whiteboard" ? "Whiteboard" :
          mode === "pair_code" ? "Pair Programming" :
          "Video Feed";
        toast.info(`Partner switched to ${modeLabel}`);
      }
    };

    const handleCallEnded = () => {
      if (incomingCallRef.current && !isCallAcceptedRef.current) {
        toast.info(`Missed call from @${callerInfoRef.current?.userDetails?.username || 'collaborator'}`);
      } else {
        toast.info("Call ended");
      }
      endCall(false);
    };

    const handleCallRejected = () => {
      toast.info("Call declined");
      endCall(false);
    };

    const handleCallError = ({ message }) => {
      toast.error(message || "Video calls are only allowed between connected peers.");
      endCall(false);
    };

    socket.on("video-answer", handleVideoAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-error", handleCallError);
    socket.on("pair_code_update", handlePairCodeUpdate);
    socket.on("whiteboard_draw_update", handleWhiteboardDraw);
    socket.on("whiteboard_cleared", handleWhiteboardClear);
    socket.on("call_mode_update", handleCallModeUpdate);

    return () => {
      socket.off("video-answer", handleVideoAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-error", handleCallError);
      socket.off("pair_code_update", handlePairCodeUpdate);
      socket.off("whiteboard_draw_update", handleWhiteboardDraw);
      socket.off("whiteboard_cleared", handleWhiteboardClear);
      socket.off("call_mode_update", handleCallModeUpdate);
    };
  }, [socket]);

  const drawStrokeOnCanvas = (ctx, stroke) => {
    const canvas = ctx.canvas;
    const w = canvas.width;
    const h = canvas.height;

    ctx.beginPath();
    // Normalize coordinates so strokes span 100% of the canvas height and width on all devices
    const prevX = stroke.prevX <= 1 ? stroke.prevX * w : stroke.prevX;
    const prevY = stroke.prevY <= 1 ? stroke.prevY * h : stroke.prevY;
    const currX = stroke.currX <= 1 ? stroke.currX * w : stroke.currX;
    const currY = stroke.currY <= 1 ? stroke.currY * h : stroke.currY;

    ctx.moveTo(prevX, prevY);
    ctx.lineTo(currX, currY);
    ctx.strokeStyle = stroke.isEraser ? "#020617" : stroke.color;
    ctx.lineWidth = stroke.isEraser ? stroke.size * 4 : stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.closePath();
  };

  const redrawWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    whiteboardHistory.current.forEach((stroke) => {
      drawStrokeOnCanvas(ctx, stroke);
    });
  };

  const updateCanvasDimensions = () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const targetWidth = Math.round(rect.width * dpr);
      const targetHeight = Math.round(rect.height * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        redrawWhiteboard();
      }
    }
  };

  useEffect(() => {
    if (callMode === "whiteboard") {
      updateCanvasDimensions();
      const frame = requestAnimationFrame(updateCanvasDimensions);
      const timer = setTimeout(updateCanvasDimensions, 200);
      window.addEventListener("resize", updateCanvasDimensions);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        window.removeEventListener("resize", updateCanvasDimensions);
      };
    }
  }, [callMode]);

  const switchCallMode = (newMode, emitEvent = true) => {
    setCallMode(newMode);
    if (emitEvent) {
      const rawTarget = callPartnerId.current || callerInfo?.from || selectedUser?._id || selectedUser;
      const targetId = typeof rawTarget === "object" && rawTarget?._id ? rawTarget._id.toString() : (rawTarget ? rawTarget.toString() : null);
      if (targetId && socket) {
        socket.emit("call_mode_change", {
          to: targetId,
          mode: newMode
        });
      }
    }
  };

  useEffect(() => {
    const handleInitiate = (e) => {
      const target = e.detail?.targetUser || selectedUser;
      if (target?._id) {
        startCall(target);
      } else {
        toast.error("Please open a conversation to start video call");
      }
    };
    window.addEventListener("initiate-video-call", handleInitiate);
    return () => window.removeEventListener("initiate-video-call", handleInitiate);
  }, [selectedUser, activeCall, loading, facingMode, socket, loggedInUser]);

  useEffect(() => {
    let shouldRing = false;

    if (incomingCall && !activeCall) {
      // Receiver is getting a call
      shouldRing = true;
    } else if (activeCall && !isCallAccepted) {
      // Caller is waiting for answer
      shouldRing = true;
    }

    if (shouldRing) {
      if (!ringtoneAudio.current) {
        ringtoneAudio.current = new RingtoneSynth();
      }
      ringtoneAudio.current.play().catch(e => console.log("Audio autoplay blocked", e));
    } else {
      if (ringtoneAudio.current) {
        ringtoneAudio.current.pause();
      }
    }
  }, [incomingCall, activeCall, isCallAccepted]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / (rect.height || 1)));
    return { x: normX, y: normY };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    lastPos.current = getCanvasCoords(e);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x: currX, y: currY } = getCanvasCoords(e);
    const prevX = lastPos.current.x;
    const prevY = lastPos.current.y;

    const stroke = { prevX, prevY, currX, currY, color: brushColor, size: brushSize, isEraser };
    whiteboardHistory.current.push(stroke);

    const ctx = canvas.getContext("2d");
    drawStrokeOnCanvas(ctx, stroke);

    lastPos.current = { x: currX, y: currY };

    const targetId = callPartnerId.current || callerInfo?.from || selectedUser?._id;
    if (targetId && socket) {
      socket.emit("whiteboard_draw", {
        to: targetId,
        drawData: stroke
      });
    }
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    isDrawing.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const clearCanvas = () => {
    whiteboardHistory.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const targetId = callPartnerId.current || callerInfo?.from || selectedUser?._id;
    if (targetId && socket) {
      socket.emit("whiteboard_clear", { to: targetId });
    }
  };

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setPairCode(newCode);
    const targetId = callPartnerId.current || callerInfo?.from || selectedUser?._id;
    if (targetId && socket) {
      socket.emit("pair_code_change", {
        to: targetId,
        code: newCode,
        language: pairLanguage
      });
    }
  };

  const copyPairCode = () => {
    navigator.clipboard.writeText(pairCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success("Code copied to clipboard");
  };

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      {incomingCall && !activeCall && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm bg-white border border-indigo-100 shadow-2xl rounded-2xl p-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <VideoIcon className="h-6 w-6 animate-pulse" />
            </div>
            <div className="flex-1 flex flex-col">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Incoming Synergy Session</p>
                <p className="text-sm font-bold text-slate-900">{callerInfo?.userDetails?.username || "Colleague"}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={acceptCall} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl h-10">ACCEPT</Button>
            <Button onClick={rejectCall} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold rounded-xl h-10">REJECT</Button>
          </div>
        </div>
      )}

      <Dialog open={activeCall} onOpenChange={(val) => !val && endCall(true)}>
        <DialogContent className="w-[96vw] max-w-5xl h-[90dvh] max-h-[92dvh] p-3 sm:p-6 bg-slate-950 border border-purple-500/30 text-white rounded-3xl overflow-hidden z-[9999] flex flex-col justify-between shadow-2xl">
          <DialogHeader className="p-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <DialogTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate max-w-[220px] sm:max-w-md">
                Synergy Video Call • {selectedUser?.username || callerInfo?.userDetails?.username || "Collaborator"}
              </DialogTitle>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-bold overflow-x-auto max-w-full">
              <button
                onClick={() => switchCallMode("video")}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                  callMode === "video" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                <VideoIcon className="h-3.5 w-3.5" /> Video Feed
              </button>
              <button
                onClick={() => switchCallMode("pair_code")}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                  callMode === "pair_code" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                <Code className="h-3.5 w-3.5" /> Pair Code
              </button>
              <button
                onClick={() => switchCallMode("whiteboard")}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                  callMode === "whiteboard" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                <Paintbrush className="h-3.5 w-3.5" /> Whiteboard
              </button>
            </div>
          </DialogHeader>

          {/* Workspace Body */}
          <div className="flex-1 w-full my-3 overflow-hidden relative">
            
            {/* 1. Video Only Mode */}
            {callMode === "video" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full min-h-0">
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg min-h-0">
                  <video
                    ref={setLocalVideo}
                    autoPlay
                    muted
                    playsInline
                    onLoadedMetadata={(e) => e.currentTarget.play().catch(() => {})}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white">
                    You ({loggedInUser?.username})
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg min-h-0">
                  <video
                    ref={setRemoteVideo}
                    autoPlay
                    muted
                    playsInline
                    onLoadedMetadata={(e) => e.currentTarget.play().catch(() => {})}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-3 left-3 bg-indigo-600/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white">
                    Partner ({selectedUser?.username || callerInfo?.userDetails?.username || "Collaborator"})
                  </span>
                </div>
              </div>
            )}

            {/* 2. Pair Programming Mode */}
            {callMode === "pair_code" && (
              <div className="flex flex-col md:flex-row gap-3 h-full min-h-0">
                {/* Code Editor */}
                <div className="flex-1 min-h-0 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
                  <div className="p-2 sm:p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <select
                        value={pairLanguage}
                        onChange={(e) => setPairLanguage(e.target.value)}
                        className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="python">Python</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="sql">SQL</option>
                        <option value="go">Go</option>
                      </select>
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span> Live Socket Sync
                      </span>
                    </div>

                    <button
                      onClick={copyPairCode}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedCode ? "Copied" : "Copy Code"}
                    </button>
                  </div>

                  <textarea
                    value={pairCode}
                    onChange={handleCodeChange}
                    className="flex-1 w-full p-4 bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed outline-none resize-none border-none selection:bg-indigo-600 selection:text-white"
                    placeholder="Start typing code collaboratively..."
                  />
                </div>

                {/* PiP Videos Side-panel on Desktop, or Compact Bottom Strip on Mobile */}
                <div className="w-full md:w-56 flex md:flex-col gap-2 shrink-0 h-24 sm:h-28 md:h-auto">
                  <div className="relative flex-1 md:h-36 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md">
                    <video
                      ref={setLocalVideo}
                      autoPlay
                      muted
                      playsInline
                      onLoadedMetadata={(e) => e.currentTarget.play().catch(() => {})}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-bold">You</span>
                  </div>
                  <div className="relative flex-1 md:h-36 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md">
                    <video
                      ref={setRemoteVideo}
                      autoPlay
                      muted
                      playsInline
                      onLoadedMetadata={(e) => e.currentTarget.play().catch(() => {})}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-2 bg-indigo-600/80 px-1.5 py-0.5 rounded text-[9px] font-bold">Partner</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Whiteboard Mode */}
            {callMode === "whiteboard" && (
              <div className="flex flex-col md:flex-row gap-3 h-full min-h-0">
                {/* Canvas Area */}
                <div className="flex-1 min-h-0 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col overflow-hidden relative">
                  {/* Canvas Toolbar */}
                  <div className="p-2 sm:p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Palette:</span>
                      {["#6366f1", "#10b981", "#f43f5e", "#f59e0b", "#06b6d4", "#ffffff"].map((c) => (
                        <button
                          key={c}
                          onClick={() => { setBrushColor(c); setIsEraser(false); }}
                          style={{ backgroundColor: c }}
                          className={`h-5 w-5 rounded-full border-2 transition-transform ${
                            brushColor === c && !isEraser ? "scale-125 border-white shadow-lg" : "border-transparent"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEraser(!isEraser)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          isEraser ? "bg-amber-500 text-slate-950 font-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        <Eraser className="h-3.5 w-3.5" /> Eraser
                      </button>

                      <button
                        onClick={clearCanvas}
                        className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Clear Board
                      </button>
                    </div>
                  </div>

                  {/* HTML5 Canvas */}
                  <div className="flex-1 w-full min-h-0 relative cursor-crosshair overflow-hidden bg-slate-950">
                    <canvas
                      ref={canvasRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className="absolute inset-0 w-full h-full bg-slate-950 touch-none block select-none"
                    />
                  </div>
                </div>

                {/* PiP Videos Side-panel on Desktop, or Compact Bottom Strip on Mobile */}
                <div className="w-full md:w-56 flex md:flex-col gap-2 shrink-0 h-24 sm:h-28 md:h-auto">
                  <div className="relative flex-1 md:h-36 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md">
                    <video
                      ref={setLocalVideo}
                      autoPlay
                      muted
                      playsInline
                      onLoadedMetadata={(e) => e.currentTarget.play().catch(() => {})}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-bold">You</span>
                  </div>
                  <div className="relative flex-1 md:h-36 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md">
                    <video
                      ref={setRemoteVideo}
                      autoPlay
                      muted
                      playsInline
                      onLoadedMetadata={(e) => e.currentTarget.play().catch(() => {})}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-2 bg-indigo-600/80 px-1.5 py-0.5 rounded text-[9px] font-bold">Partner</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Control Actions */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-4">
            <Button
              onClick={() => endCall(true)}
              className="h-12 px-6 bg-red-600 hover:bg-red-700 rounded-2xl shadow-xl shadow-red-500/20 font-black text-xs uppercase tracking-wider gap-2"
            >
              <PhoneOff className="h-4 w-4" /> End Call
            </Button>
            <Button
              onClick={() => dispatch(toggleMute())}
              className={`h-12 w-12 rounded-2xl transition-all ${
                isMuted ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              onClick={() => dispatch(toggleCamera())}
              className={`h-12 w-12 rounded-2xl transition-all ${
                isCameraOff ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              {isCameraOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalCallManager;
