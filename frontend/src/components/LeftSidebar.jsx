import {
  Bell,
  Home,
  LogOut,
  MessageCircle,
  PlusSquare,
  Search,
  Users,
  Briefcase,
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
import JobFitModal from './JobFitModal';


const LeftSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [synergyOpen, setSynergyOpen] = useState(false);
  const [jobFitOpen, setJobFitOpen] = useState(false);
  const { likeNotification } = useSelector(state => state.realtimenotification);

  const { messages } = useSelector(state => state.messageNotification);
  const unseenMessagesCount = messages.filter(m => !m.seen).length;
  
  // Filter notifications for the bell (Post engagements + Connection Acceptances + Collaborations)
  const bellNotifications = likeNotification.filter(n => ['like', 'comment', 'connectionAccepted', 'synergyTag', 'vouchAccepted'].includes(n.type));
  const unseenNotificationsCount = bellNotifications.filter(n => !n.seen).length;

  const isItemActive = (itemText) => {
    if (itemText === 'Home') return location.pathname === '/';
    if (itemText === 'Zocial Scout') return location.pathname === '/scout';
    if (itemText === 'Bounties') return location.pathname === '/bounties';
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
    { icon: <Compass />, text: 'Zocial Scout', badge: 'SCOUT' },
    { icon: <Briefcase />, text: 'Bounties' },
    { icon: <Sparkles className="text-indigo-600" />, text: 'AI Job-Fit', badge: 'AI' },
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
    else if (text === "Bounties") {
      navigate("/bounties");
    }
    else if (text === "Zocial Scout") {
      navigate("/scout");
    }
    else if (text === "AI Job-Fit") {
      setJobFitOpen(true);
    }

  }

  return (
    <>
      {/* Desktop Sidebar (left vertical) */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 bg-white/40 backdrop-blur-3xl border-r border-purple-100/40 px-6 py-8 z-20">

        <div className="space-y-6">
          <h1 onClick={() => navigate("/")} className='text-3xl font-black px-3 text-gradient mb-6 tracking-tighter cursor-pointer'>
            Zocial
          </h1>
          <div className="space-y-1.5">
            {sidebar.map((item, index) => {
              const synergyCount = item.text === "Synergy" ? unseenSynergyCount : 0;
              const active = isItemActive(item.text);
              const content = (
                <div
                  onClick={() => { if (item.text !== "Notifications") sidebarHandler(item.text) }}
                  className={`flex items-center relative gap-3.5 cursor-pointer px-4 py-3 rounded-2xl transition-all duration-300 group w-full ${
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
      </div>

      {/* Mobile top logo & handy quick action chips */}
      <div className='lg:hidden fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-4 py-3 glass backdrop-blur-xl border-b border-purple-100/50 shadow-sm'>
        <h1 onClick={() => navigate("/")} className='text-2xl font-black text-gradient tracking-tighter cursor-pointer shrink-0'>
          Zocial
        </h1>
        <div className="flex gap-1.5 items-center">
            <button 
              onClick={() => navigate("/scout")} 
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black transition-all shadow-sm ${
                location.pathname === "/scout" 
                  ? "bg-purple-600 text-white shadow-purple-500/20" 
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60"
              }`}
            >
              <Compass className="h-3 w-3" /> Scout
            </button>
            <button 
              onClick={() => navigate("/bounties")} 
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black transition-all shadow-sm ${
                location.pathname === "/bounties" 
                  ? "bg-emerald-600 text-white shadow-emerald-500/20" 
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
              }`}
            >
              <Briefcase className="h-3 w-3" /> Bounties
            </button>
            <button 
              onClick={() => setJobFitOpen(true)} 
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-black shadow-sm active:scale-95 transition-all"
            >
              <Sparkles className="h-3 w-3 text-amber-300" /> AI Fit
            </button>
            <button onClick={() => setSearchOpen(true)} className="p-1.5 text-slate-600 hover:text-purple-600 transition-colors">
              <Search className="h-4 w-4" />
            </button>
            <button onClick={logoutHandler} className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
        </div>
      </div>


      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-6 left-6 right-6 z-50 lg:hidden h-16 flex justify-around items-center rounded-2xl glass-card backdrop-blur-2xl px-2 border border-purple-100/60 shadow-xl shadow-purple-900/10">
        {sidebar.filter(item => ['Home', 'Notifications', 'Synergy', 'Messages', 'Create', 'Profile'].includes(item.text)).map((item, index) => {
          const active = isItemActive(item.text);
          const mobileContent = (
            <div
              onClick={() => { if (item.text !== "Notifications") sidebarHandler(item.text) }}
              className={`flex flex-col items-center justify-center relative w-11 h-11 transition-all rounded-xl cursor-pointer ${
                active
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25"
                  : "text-slate-500 hover:text-purple-700 hover:bg-purple-50/70"
              }`}
            >
               {item.icon}
               {item.text === "Notifications" && unseenNotificationsCount > 0 && (
                 <span className="absolute right-1 top-1 bg-purple-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full z-10">
                   {unseenNotificationsCount}
                 </span>
               )}

               {item.text === "Synergy" && unseenSynergyCount > 0 && (
                 <span className="absolute right-1 top-1 bg-purple-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full z-10">
                   {unseenSynergyCount}
                 </span>
               )}

               {item.text === "Messages" && unseenMessagesCount > 0 && (
                 <span className="absolute right-1 top-1 bg-purple-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full z-10">
                   {unseenMessagesCount}
                 </span>
               )}
            </div>
          );

           if (item.text === "Notifications") {
             return (
               <NotificationPopover key={index} likeNotification={bellNotifications}>
                 {mobileContent}
               </NotificationPopover>
             );
           }

          return <div key={index}>{mobileContent}</div>;
        })}
      </div>
      <CreatePost open={open} setOpen={setOpen} />
      <SearchDialog open={searchOpen} setOpen={setSearchOpen} />
      <SynergyRequests open={synergyOpen} setOpen={setSynergyOpen} />
      <JobFitModal open={jobFitOpen} setOpen={setJobFitOpen} />
    </>


  );
};

export default LeftSidebar;
