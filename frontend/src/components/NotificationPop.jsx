import React from "react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { FaHeart, FaComment } from "react-icons/fa";
import { UserPlus, UserMinus, UserCheck, Network, Handshake, ShieldCheck } from "lucide-react"; // Verified dependency
import axios from "axios";
import { markAllNotificationsSeen } from "@/redux/rtnSlice";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedPost, setEngagementModalOpen } from "@/redux/postSlice";

const NotificationPopover = ({ likeNotification = [], children }) => {
  const dispatch = useDispatch();
  const { posts } = useSelector(state => state.post);

  const handleNotificationClick = (postId) => {
    const post = posts.find(p => p._id === postId);
    if (post) {
      dispatch(setSelectedPost(post));
      dispatch(setEngagementModalOpen(true));
    }
  };

  // Filter out non-bell notifications (Keep likes, comments, and connection acceptances)
  const filteredNotifications = likeNotification.filter(n => ['like', 'comment', 'connectionAccepted'].includes(n.type));

  return (
    <Popover
      onOpenChange={async (open) => {
        if (open) {
          dispatch(markAllNotificationsSeen());
          try {
            await axios.post(`${import.meta.env.VITE_API_URL}/notification/mark-read`, {}, { withCredentials: true });
          } catch (error) {
            console.error("Failed to mark notifications as read", error);
          }
        }
      }}
    >
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      
      <PopoverContent className="w-80 max-h-[400px] overflow-hidden p-0 bg-white/95 backdrop-blur-2xl shadow-2xl rounded-2xl border border-white/20 z-50">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-800 tracking-tight">Recent Insights</h3>
        </div>
        
        <div className="overflow-y-auto max-h-[340px] p-2 space-y-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs font-bold uppercase tracking-widest">Quiet in the Network</p>
            </div>
          ) : (
            [...filteredNotifications]
              .reverse()
              .map((notification) => (
                <div
                  key={`${notification.userId}-${notification.postId}-${notification.timestamp}`}
                  onClick={() => handleNotificationClick(notification.postId)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group ${!notification.seen ? "bg-indigo-50/50 hover:bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                >
                  <div className="relative">
                    <Link 
                      to={`/profile/${notification.userId}`} 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm transition-transform hover:scale-110 active:scale-95">
                        <AvatarImage
                          src={notification.userDetails?.profilepicture || "https://github.com/shadcn.png"}
                          alt={notification.userDetails?.username || "User"}
                        />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                          {notification.userDetails?.username?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                         <div className={`rounded-full p-0.5 ${
                             notification.type === 'like' ? 'bg-rose-500' : 
                             notification.type === 'comment' ? 'bg-indigo-500' :
                             notification.type === 'connectionRequest' ? 'bg-amber-500' :
                             notification.type === 'connectionAccepted' ? 'bg-emerald-500' :
                             notification.type === 'synergyTag' ? 'bg-purple-600' :
                             notification.type === 'vouchAccepted' ? 'bg-amber-600' :
                             'bg-slate-400'
                         }`}>
                            {notification.type === 'like' && <FaHeart className="text-white text-[8px]" />}
                            {notification.type === 'comment' && <FaComment className="text-white text-[8px]" />}
                            {notification.type === 'connectionRequest' && <Network className="text-white h-2 w-2" />}
                            {notification.type === 'connectionAccepted' && <UserCheck className="text-white h-2 w-2" />}
                            {notification.type === 'synergyTag' && <Handshake className="text-white h-2 w-2" />}
                            {notification.type === 'vouchAccepted' && <ShieldCheck className="text-white h-2 w-2" />}
                         </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <p className="text-xs text-slate-700 leading-tight">
                      <Link 
                        to={`/profile/${notification.userId}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="font-black text-slate-900 hover:text-indigo-600 transition-colors"
                      >
                        {notification.userDetails?.username}
                      </Link>{" "}
                      {notification.type === 'like' ? 'voted on your transmission' : 
                       notification.type === 'comment' ? 'analyzed your transmission' :
                       notification.type === 'connectionRequest' ? 'requested profile synergy' :
                       notification.type === 'connectionAccepted' ? 'accepted your synergy request' :
                       notification.type === 'synergyTag' ? 'tagged you as collaborator on a transmission' :
                       notification.type === 'vouchAccepted' ? 'verified peer synergy on your transmission' :
                       'updated their connection'}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5 italic">
                        {notification.type === 'like' ? 'Professional Endorsement' : 
                         notification.type === 'comment' ? 'Collaborative Insight' :
                         notification.type === 'connectionRequest' ? 'Network Opportunity' :
                         notification.type === 'connectionAccepted' ? 'Neural Link Established' :
                         notification.type === 'synergyTag' ? 'Synergy Attribution' :
                         notification.type === 'vouchAccepted' ? 'Verified Synergy' :
                         'Network Update'}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPopover;
