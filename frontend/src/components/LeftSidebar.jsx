import {
  Bell,
  Home,
  LogOut,
  MessageCircle,
  PlusSquare,
  Search,
  Users,
  Sparkles,
  Compass,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthUser } from '@/redux/authSlice';
import { useState } from 'react';
import CreatePost from './CreatePost';
import { setPosts, setSelectedPost } from '@/redux/postSlice';
import NotificationPopover from './NotificationPop';
import { clearNotifications, markSynergyNotificationsSeen } from '@/redux/rtnSlice';
import { clearMessages } from '@/redux/messageNotificationSlice';
import SearchDialog from './SearchDialog';
import SynergyRequests from './SynergyRequests';


const LeftSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [synergyOpen, setSynergyOpen] = useState(false);
  const { likeNotification } = useSelector(state => state.realtimenotification);

  const { messages } = useSelector(state => state.messageNotification);
  const unseenMessagesCount = messages.filter(m => !m.seen).length;
  
  // Filter notifications for the bell (Post engagements + Connection Acceptances + Collaborations)
  const bellNotifications = likeNotification.filter(n => ['like', 'comment', 'connectionAccepted', 'synergyTag', 'vouchAccepted'].includes(n.type));
  const unseenNotificationsCount = bellNotifications.filter(n => !n.seen).length;

  const isItemActive = (itemText) => {
    if (itemText === 'Home') return location.pathname === '/';
    if (itemText === 'Zocial Scout') return location.pathname === '/scout';
    if (itemText === 'Messages') return location.pathname === '/chat';
    if (itemText === 'Profile') return location.pathname === `/profile/${user?._id}`;
    return false;
  };

  // Synergy/Network notifications (Strictly incoming requests)
  const synergyNotifications = likeNotification.filter(n => ['connectionRequest'].includes(n.type));
  const unseenSynergyCount = synergyNotifications.filter(n => !n.seen).length;


  const sidebar = [
    { icon: <Home />, text: 'Home' },
    { icon: <Search />, text: 'Search' },
    { icon: <Compass />, text: 'Zocial Scout' },
    { icon: <Bell />, text: 'Notifications' },
    { icon: <Users />, text: 'Synergy' },
    { icon: <MessageCircle />, text: 'Messages' },
    { icon: <PlusSquare />, text: 'Create' },
    {
      icon: (
        <Avatar className="h-6 w-6">
          <AvatarImage src={user?.profilepicture || "https://github.com/shadcn.png"} />
          <AvatarFallback className="bg-slate-100 font-bold text-slate-700 text-xs">{user?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
      ),
      text: 'Profile',
    },
    { icon: <LogOut />, text: 'Logout' },
  ];

  const logoutHandler = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/logout`, { withCredentials: true })
      toast.success(res.data.message)
      dispatch(setAuthUser(null))
      dispatch(setPosts([]))
      dispatch(setSelectedPost(null))
      dispatch(clearNotifications())
      dispatch(clearMessages())
      navigate("/login")
    }
    catch (error) {
      toast.error(error.response.data.message)
    }
  }

  const sidebarHandler = (text) => {

    if (text === "Logout") {
      logoutHandler()
    }
    else if (text === "Create") {
      setOpen(true)
    }
    else if (text === "Search") {
      setSearchOpen(true)
    }
    else if (text === "Synergy") {
      dispatch(markSynergyNotificationsSeen());
      setSynergyOpen(true)
    }
    else if (text === "Profile") {

      navigate(`/profile/${user._id}`)
    }
    else if (text === "Home") {
      navigate("/")
    }
    else if (text === "Messages") {
      navigate("/chat");
    }
    else if (text === "Zocial Scout") {
      navigate("/scout");
    }

  }

  return (
    <>
      {/* Desktop Sidebar (left vertical) */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 bg-white/50 backdrop-blur-3xl border-r border-purple-100/40 px-4 py-5 z-20 overflow-y-auto overflow-x-hidden print:hidden">

        <div className="shrink-0 mb-4 px-3">
          <h1 onClick={() => navigate("/")} className='text-3xl font-black text-gradient tracking-tighter cursor-pointer'>
            Zocial
          </h1>
        </div>

        <div className="space-y-1 pb-4">
          {sidebar.map((item, index) => {
            const synergyCount = item.text === "Synergy" ? unseenSynergyCount : 0;
            const active = isItemActive(item.text);
            const content = (
              <div
                onClick={() => { if (item.text !== "Notifications") sidebarHandler(item.text) }}
                className={`flex items-center relative gap-3.5 cursor-pointer px-4 py-2.5 rounded-2xl transition-all duration-300 group w-full ${
                  active
                    ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-lg shadow-purple-500/25 font-black"
                    : "text-slate-600 hover:text-purple-700 hover:bg-purple-50/70 font-bold"
                }`}
              >
                <span className={`text-xl transition-transform group-hover:scale-110 ${active ? "text-white" : ""}`}>
                  {item.icon}
                </span>
                <span className="text-sm tracking-tight">{item.text}</span>
                
                {item.badge && (
                  <span className={`ml-auto text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    active
                      ? "bg-white/20 text-white border-white/30"
                      : "bg-purple-50 text-purple-700 border-purple-200"
                  }`}>
                    {item.badge}
                  </span>
                )}

                {item.text === "Notifications" && unseenNotificationsCount > 0 && (
                  <span className="absolute left-7 top-2 bg-purple-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-lg z-10">
                    {unseenNotificationsCount}
                  </span>
                )}

                {synergyCount > 0 && (
                  <span className="absolute left-7 top-2 bg-purple-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-lg z-10">
                    {synergyCount}
                  </span>
                )}

                {item.text === "Messages" && unseenMessagesCount > 0 && (
                  <span className="absolute left-7 top-2 bg-purple-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-lg">
                    {unseenMessagesCount}
                  </span>
                )}
              </div>
            );

            if (item.text === "Notifications") {
              return (
                <NotificationPopover key={index} likeNotification={bellNotifications}>
                  {content}
                </NotificationPopover>
              );
            }

            return <div key={index}>{content}</div>;
          })}
        </div>
      </div>

      {/* Mobile Top Navigation & Quick Feature Pills */}
      <div className='lg:hidden fixed top-0 left-0 right-0 z-50 glass backdrop-blur-xl border-b border-purple-100/50 shadow-sm print:hidden'>
        {/* Top Header Row */}
        <div className="flex justify-between items-center px-4 py-2.5">
          <h1 onClick={() => navigate("/")} className='text-2xl font-black text-gradient tracking-tighter cursor-pointer'>
            Zocial
          </h1>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setSearchOpen(true)} 
              className="p-2 text-slate-600 hover:text-purple-600 rounded-xl hover:bg-purple-50 transition-colors"
              title="Search Builders"
            >
              <Search className="h-5 w-5" />
            </button>
            <NotificationPopover likeNotification={bellNotifications}>
              <button className="relative p-2 text-slate-600 hover:text-purple-600 rounded-xl hover:bg-purple-50 transition-colors">
                <Bell className="h-5 w-5" />
                {unseenNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 bg-purple-600 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-sm">
                    {unseenNotificationsCount}
                  </span>
                )}
              </button>
            </NotificationPopover>
            <button 
              onClick={logoutHandler} 
              className="p-2 text-slate-600 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Feature Pills Horizontal Scrollbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto no-scrollbar border-t border-purple-100/40 bg-white/40">
          <button 
            onClick={() => navigate("/scout")} 
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black shrink-0 transition-all shadow-sm ${
              location.pathname === "/scout" 
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/25" 
                : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60"
            }`}
          >
            <Compass className="h-3.5 w-3.5" /> Scout Engine
          </button>
          <button 
            onClick={() => { dispatch(markSynergyNotificationsSeen()); setSynergyOpen(true); }} 
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black shrink-0 transition-all shadow-sm ${
              unseenSynergyCount > 0 
                ? "bg-amber-100 text-amber-900 border border-amber-300" 
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Synergy
            {unseenSynergyCount > 0 && (
              <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                {unseenSynergyCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden h-16 bg-white/95 backdrop-blur-2xl border-t border-purple-100/60 flex items-center justify-around px-3 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] print:hidden">
        {/* Home */}
        <button
          onClick={() => navigate("/")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
            location.pathname === "/" ? "text-purple-600 font-black" : "text-slate-500 hover:text-purple-600"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-0.5">Home</span>
        </button>

        {/* Messages */}
        <button
          onClick={() => navigate("/chat")}
          className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
            location.pathname === "/chat" ? "text-purple-600 font-black" : "text-slate-500 hover:text-purple-600"
          }`}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-0.5">Chat</span>
          {unseenMessagesCount > 0 && (
            <span className="absolute top-1 right-2 bg-purple-600 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
              {unseenMessagesCount}
            </span>
          )}
        </button>

        {/* Center Prominent Create Button */}
        <button
          onClick={() => setOpen(true)}
          className="h-12 w-12 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 active:scale-95 transition-all -translate-y-2 border-2 border-white"
          title="Create Transmission"
        >
          <PlusSquare className="h-6 w-6" />
        </button>

        {/* Synergy Network */}
        <button
          onClick={() => { dispatch(markSynergyNotificationsSeen()); setSynergyOpen(true); }}
          className="relative flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-500 hover:text-purple-600 transition-all"
        >
          <Users className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-0.5">Synergy</span>
          {unseenSynergyCount > 0 && (
            <span className="absolute top-1 right-2 bg-amber-500 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
              {unseenSynergyCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <button
          onClick={() => navigate(`/profile/${user?._id}`)}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
            location.pathname.startsWith("/profile") ? "text-purple-600 font-black" : "text-slate-500 hover:text-purple-600"
          }`}
        >
          <Avatar className="h-5 w-5 border border-purple-200">
            <AvatarImage src={user?.profilepicture || "https://github.com/shadcn.png"} />
            <AvatarFallback className="bg-purple-100 text-purple-700 font-bold text-[9px]">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-[9px] font-bold mt-0.5">Profile</span>
        </button>
      </div>
      <CreatePost open={open} setOpen={setOpen} />
      <SearchDialog open={searchOpen} setOpen={setSearchOpen} />
      <SynergyRequests open={synergyOpen} setOpen={setSynergyOpen} />
    </>


  );
};

export default LeftSidebar;
