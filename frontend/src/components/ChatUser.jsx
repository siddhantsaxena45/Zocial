import React, { useEffect, useState } from "react";
import { ArrowLeft, Loader2, VideoIcon, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
// import VideoCall from "./VideoCallDialog";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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
        <div className="flex items-center gap-5">
            {isMutualConnection ? (
                <>
                <Link to={`/resume/${user._id}`} className="group relative">
                    <FileText className="w-7 h-7 text-indigo-600 hover:text-indigo-800 cursor-pointer transition-all hover:scale-110 active:scale-90" />
                    <div className="absolute top-10 right-0 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                        View Resume
                    </div>
                </Link>
                <div className="group relative">
                    <VideoIcon 
                        onClick={() => window.dispatchEvent(new CustomEvent("initiate-video-call"))}
                        className="w-8 h-8 text-indigo-600 hover:text-indigo-800 cursor-pointer transition-all hover:scale-110 active:scale-90" 
                    />
                    <div className="absolute top-10 right-0 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                        Video Call
                    </div>
                </div>
                </>
            ) : (
                <div className="flex items-center gap-5 opacity-20 cursor-not-allowed group relative">
                    <FileText className="w-7 h-7 text-slate-400" />
                    <VideoIcon className="w-8 h-8 text-slate-400" />
                    <div className="absolute top-10 right-0 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                        Mutual Link Required
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-20 py-6 flex flex-col gap-3">
        {messages?.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[75%] md:max-w-md px-5 py-3 rounded-2xl text-sm font-medium shadow-sm transition-all hover:shadow-md ${
              (msg.senderId?._id || msg.senderId) === loggedInUser?._id
                ? "bg-indigo-600 text-white self-end rounded-br-none shadow-indigo-100"
                : "bg-white text-slate-900 self-start rounded-bl-none border border-slate-100 shadow-slate-200/50"
            }`}
          >
            {msg.message}
          </div>
        ))}
      </div>

      {/* Input / Reply Rule */}
      <div className="p-4 md:p-6 bg-white/80 backdrop-blur-2xl border-t border-slate-100 flex flex-col gap-4 shadow-[0_-10px_25px_rgba(0,0,0,0.02)]">
        {isMutualConnection ? (
            <div className="flex gap-4 items-center w-full">
                <div className="flex-1 relative group">
                    <input
                    type="text"
                    value={text}
                    onChange={changeHandler}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a professional message..."
                    className="w-full pl-6 pr-12 py-3.5 bg-slate-100/50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm transition-all font-medium placeholder:text-slate-400 group-hover:shadow-inner"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-40 group-focus-within:opacity-100 transition-opacity">
                        <span className="text-[10px] font-black text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-md">ENTER</span>
                    </div>
                </div>
                {loading ? (
                <div className="h-12 w-12 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
                ) : (
                <button
                    onClick={sendMessage}
                    disabled={!text.trim()}
                    className={`h-12 w-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                        text.trim() 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-95' 
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                >
                    <span className="text-xl -rotate-45 translate-x-0.5 -translate-y-0.5">➤</span>
                </button>
                )}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Identity Verification Required</p>
                <Link 
                    to={`/profile/${user._id}`}
                    className="w-full bg-indigo-600 text-white text-xs font-black uppercase tracking-[0.2em] py-3 rounded-xl text-center hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                    Follow back to initiate transmission
                </Link>
                <p className="text-[9px] text-slate-400 mt-2 italic">You can only reply to Verified Professional Links.</p>
            </div>
        )}
      </div>

    </div>
  );
};

export default ChatUser;
