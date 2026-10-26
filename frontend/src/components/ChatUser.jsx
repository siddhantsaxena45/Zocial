import React, { useEffect, useState } from "react";
import { ArrowLeft, Loader2, VideoIcon, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
// import VideoCall from "./VideoCallDialog";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser } from "@/redux/authSlice";
import axios from "axios";
import useGetAllMessages from "@/hooks/useGetAllMessages";
import { toast } from "sonner";


const ChatUser = ({ user, isOnline, onBack }) => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const socket = useSelector((state) => state.socketio.socket);
  const { messages } = useSelector((state) => state.chat);
  const { user: loggedInUser } = useSelector((state) => state.auth);

  const { refetch } = useGetAllMessages(user._id);


  useEffect(() => {
    const draft = localStorage.getItem("zocial_chat_draft");
    if (draft) {
      setText(draft);
      localStorage.removeItem("zocial_chat_draft");
    }
  }, [user?._id]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = () => {
      refetch();
    };

    socket.on("message", handleNewMessage);

    return () => {
      socket.off("message", handleNewMessage);
    };
  }, [socket, refetch]);

  const changeHandler = (e) => {
    const inputText = e.target.value;
    setText(inputText.trim() ? inputText : "");
  };

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      setLoading(true);

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/message/send/${user._id}`,

        { message: text },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        toast.success(res.data.message);
        await refetch();
        setText("");
      }
    } catch (err) {
      
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const isMutualConnection = user.isMutual || (
    (loggedInUser?.following || []).some(id => String(id?._id || id) === String(user._id)) &&
    (loggedInUser?.followers || []).some(id => String(id?._id || id) === String(user._id))
  );

  return (
    <div className="w-full h-full bg-slate-50/50 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm z-10">

        <div className="flex items-center gap-3">
          {onBack && (
              <button
                onClick={onBack}
                className="mr-2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

          )}
          <Link to={`/profile/${user?._id}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={user?.profilepicture || "https://github.com/shadcn.png"}
              />
              <AvatarFallback>{user?.username?.[0] || "U"}</AvatarFallback>
            </Avatar>
          </Link>
        <div className="flex flex-col">
            <Link to={`/profile/${user?._id}`} className="cursor-pointer">
              <span className="font-semibold">{user?.username || "Unknown"}</span>
            </Link>
            <div className="flex items-center gap-2">
                <span
                className={`text-[10px] font-bold ${
                    isOnline ? "text-green-500" : "text-gray-400"
                }`}
                >
                {isOnline ? "ONLINE" : "OFFLINE"}
                </span>
                {!isMutualConnection && (
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">IDENTITY REQUEST</span>
                )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
            <div className="group relative">
                <VideoIcon 
                    onClick={() => {
                        dispatch(setSelectedUser(user));
                        window.dispatchEvent(new CustomEvent("initiate-video-call", { detail: { targetUser: user } }));
                    }}
                    className="w-7 h-7 text-indigo-600 hover:text-indigo-800 cursor-pointer transition-all hover:scale-110 active:scale-90" 
                />
                <div className="absolute top-8 right-0 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    Video Call & Pair Code
                </div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-3">
        {messages?.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[80%] md:max-w-md px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm transition-all hover:shadow-md ${
              (msg.senderId?._id || msg.senderId) === loggedInUser?._id
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white self-end rounded-br-none shadow-purple-200"
                : "bg-white text-slate-900 self-start rounded-bl-none border border-purple-50 shadow-slate-200/50"
            }`}
          >
            {msg.message}
          </div>
        ))}
      </div>

      {/* Input / Reply Bar */}
      <div className="p-3 md:p-5 bg-white/90 backdrop-blur-2xl border-t border-purple-100/60 flex flex-col gap-2 shadow-[0_-10px_25px_rgba(0,0,0,0.03)] shrink-0">
        {!isMutualConnection && (
          <div className="flex items-center justify-between px-3 py-1 bg-purple-50/70 rounded-xl border border-purple-100 text-[10px] text-purple-800">
            <span className="font-semibold">Direct Collaboration Transmission</span>
            <Link to={`/profile/${user._id}`} className="font-bold underline text-purple-600">Sync Profile</Link>
          </div>
        )}
        <div className="flex gap-2 sm:gap-4 items-center w-full">
            <div className="flex-1 relative group">
                <input
                type="text"
                value={text}
                onChange={changeHandler}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a professional message..."
                className="w-full pl-4 sm:pl-6 pr-10 sm:pr-12 py-3 bg-slate-100/60 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none text-sm transition-all font-medium placeholder:text-slate-400 group-hover:shadow-inner"
                />
            </div>
            {loading ? (
            <div className="h-11 w-11 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            </div>
            ) : (
            <button
                onClick={sendMessage}
                disabled={!text.trim()}
                className={`h-11 w-11 flex items-center justify-center rounded-2xl transition-all duration-300 shrink-0 ${
                    text.trim() 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 hover:from-purple-700 hover:to-indigo-700 active:scale-95' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
            >
                <span className="text-lg -rotate-45 translate-x-0.5 -translate-y-0.5">➤</span>
            </button>
            )}
        </div>
      </div>

    </div>
  );
};

export default ChatUser;
