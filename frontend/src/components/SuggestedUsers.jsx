
import React from 'react'
import { useSelector } from 'react-redux'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link } from 'react-router-dom'

const SuggestedUsers = () => {
    const { suggestedUsers, user: currentUser } = useSelector(state => state.auth)

    // 🛡️ Data Privacy: Exclude users we already follow so they don't clog up suggestions
    const finalSuggestions = suggestedUsers
        .filter(u => !currentUser?.following?.includes(u._id))
        .slice(0, 5);

    return (
        <div className='mt-8 flex flex-col gap-4 w-full'>
            <div className='flex justify-between items-center px-1'>
                <span className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Network Suggestions</span>
                <span className='text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors'>See All</span>
            </div>
            <div className='flex flex-col gap-2'>
                {finalSuggestions.map(user => {
                    return (
                        <div className="flex items-center justify-between group p-2 rounded-xl hover:bg-indigo-50/50 transition-all duration-300" key={user._id}>
                            <div className='flex items-center gap-3 min-w-0'>
                                <Link to={`/profile/${user?._id}`} className="shrink-0">
                                    <Avatar className="h-10 w-10 rounded-xl border border-white/40 shadow-sm overflow-hidden transition-transform group-hover:scale-105">
                                        <AvatarImage src={user?.profilepicture || "https://github.com/shadcn.png"} className="w-full h-full object-cover" />
                                        <AvatarFallback className="bg-slate-100 text-slate-500 text-xs font-bold">CN</AvatarFallback>
                                    </Avatar>
                                </Link>
                                <div className='flex flex-col justify-center items-start min-w-0'>
                                    <span className="font-bold text-[13px] text-slate-900 truncate group-hover:text-indigo-600 transition-colors tracking-tight">
                                        <Link to={`/profile/${user?._id}`}>{user?.name || user?.username}</Link>
                                    </span>
                                    <span className="text-[10px] text-indigo-600 font-semibold truncate w-full">
                                        {user?.username?.startsWith('@') ? user?.username : `@${user?.username}`}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium truncate w-full italic">
                                        {user?.bio || "Professional Hub"}
                                    </span>
                                </div>
                            </div>
                            <Link to={`/profile/${user?._id}`}>
                                <span className='text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm'>
                                    Focus
                                </span>
                            </Link> 
                        </div>
                    );
                })}
            </div>
        </div>

    )
}

export default SuggestedUsers
