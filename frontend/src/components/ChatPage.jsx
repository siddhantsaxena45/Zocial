import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import ChatUser from './ChatUser';
import { setSelectedUser } from '@/redux/authSlice';
import { MessageCircle, Search } from 'lucide-react';


const ChatPage = () => {
  const [chatUsers, setChatUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const { user } = useSelector((state) => state.auth);
  const { selectedUser } = useSelector(state => state.auth)
  const { onlineUsers } = useSelector(state => state.chat)
  const dispatch = useDispatch()
  const { messages } = useSelector((state) => state.messageNotification);

  useEffect(() => {
    const fetchChatUsers = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/chat-partners`, {
          withCredentials: true
        });
        if (res.data.success) {
          setChatUsers(res.data.users);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchChatUsers();
  }, []);

  const unseenCounts = {};

  messages.forEach((msg) => {
    const sender = msg.senderId?._id || msg.senderId; // Sometimes it's populated, sometimes plain ID
    if (!msg.seen) {
      unseenCounts[sender] = (unseenCounts[sender] || 0) + 1;
    }
  });
  const latestTimestamps = {};

  messages.forEach((msg) => {
    const sender = msg.senderId?._id || msg.senderId;
    const timestamp = new Date(msg.createdAt).getTime();
    if (!latestTimestamps[sender] || timestamp > latestTimestamps[sender]) {
      latestTimestamps[sender] = timestamp;
    }
  });

  const sortedUsers = [...chatUsers].sort((a, b) => {
    // Priority: 1. Unseen messages, 2. Message Requests (Not Mutual), 3. Timestamp
    const aUnseen = unseenCounts[a._id] || 0;
    const bUnseen = unseenCounts[b._id] || 0;

    if (aUnseen !== bUnseen) return bUnseen - aUnseen;
    
    // Mutuals first generally, but Requests with unseen messages are already handled above
    if (a.isMutual !== b.isMutual) return a.isMutual ? -1 : 1;

    const aTime = latestTimestamps[a._id] || 0;
    const bTime = latestTimestamps[b._id] || 0;
    return bTime - aTime;
  });

  if (isLoadingUsers) return (
    <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );


  return (
    <div className="flex h-[calc(100dvh-13rem)] lg:h-[calc(100dvh-3rem)] w-full overflow-hidden relative bg-white border border-slate-200 shadow-sm rounded-2xl">

      {/* 📱 Mobile Full-Screen Chat */}
      {selectedUser && (
        <div className="md:hidden fixed inset-0 h-[100dvh] z-[100] bg-purple-100">
          <ChatUser 
            user={selectedUser} 
            isOnline={onlineUsers.includes(selectedUser._id.toString())} 
            onBack={() => dispatch(setSelectedUser(null))} 
          />
        </div>
      )}

      {/* 👈 Left Sidebar (Always visible) */}
      <div className="w-full md:w-80 flex-shrink-0 border-r border-slate-200 bg-white/40 backdrop-blur-3xl shadow-sm flex flex-col">
        <h1 className="text-lg font-black px-6 py-6 border-b border-slate-100 text-slate-900 uppercase text-[10px] tracking-[0.2em] opacity-60">Intelligence Hub</h1>


        <div className="overflow-y-auto flex-1 h-full font-mono bg-slate-50/20">
          {sortedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] p-8 text-center text-slate-400">
                <Search className="h-10 w-10 mb-4 opacity-20 text-indigo-400" />
                <p className="text-[11px] uppercase font-black tracking-widest leading-loose text-slate-500">
                    Neural Hub Empty
                </p>
                <p className="text-[10px] font-medium leading-relaxed mt-3 italic px-6 text-slate-400">
                    Mutual professional links or incoming message requests will appear here.
                </p>
            </div>
          ) : (
            sortedUsers.map((u) => {
              const isOnline = onlineUsers.includes(u._id.toString());
              return (

                <div
                  key={u._id}
                  onClick={() => {
                    dispatch(setSelectedUser(u))
                    const updatedMessages = messages.map(msg => {
                      const sender = msg.senderId?._id || msg.senderId;
                      if (sender === u._id) {
                        return { ...msg, seen: true };
                      }
                      return msg;
                    });

                    dispatch({ type: "messageNotification/setAllMessages", payload: updatedMessages });
                  }
                  }
                  className={`flex items-center gap-4 px-4 py-3 mx-3 my-1.5 cursor-pointer transition-all rounded-2xl hover:bg-indigo-50/80 ${selectedUser?._id === u._id ? 'bg-indigo-100/80 shadow-sm ring-1 ring-indigo-200' : ''
                    }`}

                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 shadow-sm">
                      <AvatarImage src={u.profilepicture || "https://github.com/shadcn.png"} />
                      <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                    </Avatar>
                    {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
                  </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-900 truncate">{u.username}</span>
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Verified Link</span>
                    </div>
                  <div className="ml-auto flex flex-col items-end gap-1">
                    {unseenCounts[u._id] > 0 && (
                      <span className="text-[8px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-md shadow-sm">
                        NEW
                      </span>
                    )}
                  </div>

                </div>
              )
            }
            )
          )}
        </div>
      </div>

      {/* 💬 Right Chat Panel (Desktop only) */}
      <div className="hidden md:flex flex-1 bg-slate-50/50">

        {selectedUser ? (
          <ChatUser 
            user={selectedUser} 
            isOnline={onlineUsers.includes(selectedUser._id.toString())} 
            onBack={() => dispatch(setSelectedUser(null))} 
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 w-full p-12 text-center animate-in fade-in duration-700">
            <div className="h-24 w-24 rounded-3xl bg-indigo-50 flex items-center justify-center mb-6 shadow-inner">
                <MessageCircle className='h-12 w-12 text-indigo-400' />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">Intelligence Hub Active</h2>
            <p className="max-w-xs text-sm font-medium leading-relaxed">Select a connection from the left to begin secure professional transmission.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
