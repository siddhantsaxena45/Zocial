import React from 'react';
import { useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Link } from 'react-router-dom';
import SuggestedUsers from './SuggestedUsers';

const RightSidebar = () => {
  const { user } = useSelector(state => state.auth);

  return (
    <div 
      className="
        flex flex-col 
        gap-6 
        w-80
        mt-6
        sticky top-6
      "
    >
      {/* Profile Summary Card */}
      <div className="glass-card p-6 flex items-center gap-4 w-full">
        <Link to={`/profile/${user?._id}`} className="cursor-pointer shrink-0">
          <Avatar className="h-12 w-12 rounded-xl border border-white/20 shadow-sm overflow-hidden">
            <AvatarImage src={user?.profilepicture || "https://github.com/shadcn.png"} className="w-full h-full object-cover" />
            <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold">{user?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex flex-col justify-center items-start min-w-0">
          <span className="font-black text-slate-900 text-sm truncate hover:text-indigo-600 transition-colors">
            <Link to={`/profile/${user?._id}`}>{user?.name || user?.username}</Link>
          </span>
          <span className="text-[10px] text-indigo-600 font-semibold truncate max-w-[150px]">
            {user?.username?.startsWith('@') ? user?.username : `@${user?.username}`}
          </span>
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest truncate max-w-[150px] mt-0.5">
            {user?.resume_data?.headline || user?.targetRole || "Builder Hub"}
          </span>
        </div>
      </div>

      <div className="glass-card p-6">
        <SuggestedUsers />
      </div>
    </div>
  );
};

export default RightSidebar;

