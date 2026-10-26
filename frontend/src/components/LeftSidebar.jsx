import {
  Bell,
  Home,
  LogOut,
  MessageCircle,
  PlusSquare,
  Search,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate()
  const { user } = useSelector(state => state.auth)
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [synergyOpen, setSynergyOpen] = useState(false);
  const { likeNotification } = useSelector(state => state.realtimenotification)

  const { messages } = useSelector(state => state.messageNotification);
  const unseenMessagesCount = messages.filter(m => !m.seen).length;
  
  // Filter notifications for the bell (Post engagements + Connection Acceptances)
  const bellNotifications = likeNotification.filter(n => ['like', 'comment', 'connectionAccepted'].includes(n.type));
  const unseenNotificationsCount = bellNotifications.filter(n => !n.seen).length;

  // Synergy/Network notifications (Strictly incoming requests)
  const synergyNotifications = likeNotification.filter(n => ['connectionRequest'].includes(n.type));
  const unseenSynergyCount = synergyNotifications.filter(n => !n.seen).length;


  const sidebar = [
    { icon: <Home />, text: 'Home' },
    { icon: <Search />, text: 'Search' },
    // { icon: <TrendingUp />, text: 'Explore' },

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

  }

  return (
    <>
      {/* Desktop Sidebar (left vertical) */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 bg-white/40 backdrop-blur-3xl border-r border-white/20 px-8 py-10 z-20">

        <div className="space-y-6">
          <h1 className='text-3xl font-black px-2 text-gradient mb-8 tracking-tighter'>Zocial</h1>
          <div className="space-y-1">
            {sidebar.map((item, index) => {
              const synergyCount = item.text === "Synergy" ? unseenSynergyCount : 0;
              const content = (
                <div
                  onClick={() => { if (item.text !== "Notifications") sidebarHandler(item.text) }}
                  className="flex items-center relative gap-4 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 cursor-pointer px-4 py-3 rounded-2xl transition-all duration-300 group w-full"
                >
                  <span className="text-xl transition-transform group-hover:scale-110">{item.icon}</span>
                  <span className="text-sm font-bold tracking-tight">{item.text}</span>
                  
                  {item.text === "Notifications" && unseenNotificationsCount > 0 && (
                    <span className="absolute left-7 top-2 bg-indigo-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-lg z-10">
                      {unseenNotificationsCount}
                    </span>
                  )}

                  {synergyCount > 0 && (
                    <span className="absolute left-7 top-2 bg-indigo-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-lg z-10">
                      {synergyCount}
                    </span>
                  )}

                  {item.text === "Messages" && unseenMessagesCount > 0 && (
                    <span className="absolute left-7 top-2 bg-indigo-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-lg">
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

      {/* Mobile top logo */}
      <div className='lg:hidden fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-4 glass backdrop-blur-xl border-b border-white/20'>
        <h1 className='text-2xl font-black text-gradient tracking-tighter'>Zocial</h1>
        <div className="flex gap-4 items-center">
            <button onClick={() => setSearchOpen(true)} className="text-slate-600 hover:text-indigo-600">
              <Search className="h-6 w-6" />
            </button>
            <button onClick={logoutHandler} className="text-slate-600 hover:text-red-500 transition-colors">
              <LogOut className="h-6 w-6" />
            </button>
        </div>
      </div>


      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-6 left-6 right-6 z-50 lg:hidden h-16 flex justify-around items-center rounded-2xl glass-card backdrop-blur-2xl px-2">
        {sidebar.filter(item => ['Home', 'Notifications', 'Synergy', 'Messages', 'Create', 'Profile'].includes(item.text)).map((item, index) => {
          const mobileContent = (
            <div
              onClick={() => { if (item.text !== "Notifications") sidebarHandler(item.text) }}
              className="flex flex-col items-center justify-center relative w-12 h-12 text-slate-500 hover:text-indigo-600 transition-all rounded-xl hover:bg-indigo-50/50 cursor-pointer"
            >
               {item.icon}
               {item.text === "Notifications" && unseenNotificationsCount > 0 && (
                 <span className="absolute right-1 top-1 bg-indigo-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full z-10">
                   {unseenNotificationsCount}
                 </span>
               )}

               {item.text === "Synergy" && unseenSynergyCount > 0 && (
                 <span className="absolute right-1 top-1 bg-indigo-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full z-10">
                   {unseenSynergyCount}
                 </span>
               )}

               {item.text === "Messages" && unseenMessagesCount > 0 && (
                 <span className="absolute right-1 top-1 bg-indigo-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full z-10">
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
    </>


  );
};

export default LeftSidebar;
