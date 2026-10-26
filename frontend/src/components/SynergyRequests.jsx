import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { UserCheck, UserX, Loader2, ArrowUpRight, ArrowDownLeft, Undo2, Users } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { markSynergyNotificationsSeen } from '@/redux/rtnSlice';
import { Link } from 'react-router-dom';

const SynergyRequests = ({ open, setOpen }) => {
    const [tab, setTab] = useState('incoming'); // 'incoming' | 'outgoing'
    const [incoming, setIncoming] = useState([]);
    const [outgoing, setOutgoing] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [withdrawingId, setWithdrawingId] = useState(null);
    const dispatch = useDispatch();

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/synergy/pending`, { withCredentials: true });
            if (res.data.success) {
                setIncoming(res.data.incoming || res.data.requests || []);
                setOutgoing(res.data.outgoing || []);
            }
        } catch (error) {
            console.error("Error fetching synergy requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchRequests();
        }
    }, [open]);

    const handleAction = async (requestId, action) => {
        try {
            const endpoint = action === 'accept' ? 'accept' : 'reject';
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/user/synergy/${endpoint}/${requestId}`, {}, { withCredentials: true });
            if (res.data.success) {
                toast.success(res.data.message);
                dispatch(markSynergyNotificationsSeen());
                setIncoming(prev => prev.filter(req => req._id !== requestId));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Action failed");
        }
    };

    const handleWithdraw = async (request) => {
        const targetId = request.receiver?._id || request._id;
        try {
            setWithdrawingId(request._id);
            const res = await axios.delete(
                `${import.meta.env.VITE_API_URL}/user/synergy/withdraw/${targetId}`,
                { withCredentials: true }
            );
            if (res.data.success) {
                toast.success(res.data.message || "Synergy request withdrawn");
                setOutgoing(prev => prev.filter(r => r._id !== request._id));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to withdraw request");
        } finally {
            setWithdrawingId(null);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-[0.15em] text-indigo-950">
                                Synergy Network Hub
                            </h2>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Manage incoming connection requests and track outgoing invitations
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setOpen(false)} 
                        className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors text-lg font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Sub-Header Tabs: Incoming vs Outgoing */}
                <div className="px-5 pt-3 pb-2 bg-slate-50/60 border-b border-slate-100 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setTab('incoming')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            tab === 'incoming'
                                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <ArrowDownLeft className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Incoming</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                            incoming.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                            {incoming.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTab('outgoing')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            tab === 'outgoing'
                                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <ArrowUpRight className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Sent / Outgoing</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                            outgoing.length > 0 ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-200 text-slate-600'
                        }`}>
                            {outgoing.length}
                        </span>
                    </button>
                </div>

                {/* Content List Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[220px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                            <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Loading Network Transmissions...</p>
                        </div>
                    ) : tab === 'incoming' ? (
                        incoming.length === 0 ? (
                            <div className="text-center py-12 space-y-2">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mx-auto">
                                    <ArrowDownLeft className="h-6 w-6" />
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-700">
                                    No Pending Incoming Requests
                                </p>
                                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                                    When builders invite you to collaborate or connect, their invitations will appear here.
                                </p>
                            </div>
                        ) : (
                            incoming.map((request) => (
                                <div 
                                    key={request._id} 
                                    className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 group transition-all hover:bg-white hover:shadow-md"
                                >
                                    <Link to={`/profile/${request.sender?._id}`} onClick={() => setOpen(false)}>
                                        <Avatar className="h-11 w-11 rounded-xl shadow-xs border border-white">
                                            <AvatarImage src={request.sender?.profilepicture} />
                                            <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
                                                {request.sender?.username?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <Link 
                                            to={`/profile/${request.sender?._id}`} 
                                            onClick={() => setOpen(false)}
                                            className="text-xs font-black text-slate-900 hover:text-indigo-600 transition-colors truncate block"
                                        >
                                            @{request.sender?.username}
                                        </Link>
                                        <p className="text-[10px] text-slate-500 font-medium truncate">
                                            {request.sender?.targetRole || request.sender?.bio || "Builder"}
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <Button 
                                            size="sm"
                                            onClick={() => handleAction(request._id, 'accept')}
                                            className="h-8 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs gap-1"
                                        >
                                            <UserCheck className="h-3.5 w-3.5" /> Accept
                                        </Button>
                                        <Button 
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAction(request._id, 'reject')}
                                            className="h-8 px-2.5 rounded-xl border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                                        >
                                            <UserX className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        outgoing.length === 0 ? (
                            <div className="text-center py-12 space-y-2">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mx-auto">
                                    <ArrowUpRight className="h-6 w-6" />
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-700">
                                    No Pending Outgoing Requests
                                </p>
                                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                                    You have no sent requests waiting for a response. Visit profiles or Scout to connect with builders.
                                </p>
                            </div>
                        ) : (
                            outgoing.map((request) => (
                                <div 
                                    key={request._id} 
                                    className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 group transition-all hover:bg-white hover:shadow-md"
                                >
                                    <Link to={`/profile/${request.receiver?._id}`} onClick={() => setOpen(false)}>
                                        <Avatar className="h-11 w-11 rounded-xl shadow-xs border border-white">
                                            <AvatarImage src={request.receiver?.profilepicture} />
                                            <AvatarFallback className="bg-purple-600 text-white font-bold text-xs">
                                                {request.receiver?.username?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Link 
                                                to={`/profile/${request.receiver?._id}`} 
                                                onClick={() => setOpen(false)}
                                                className="text-xs font-black text-slate-900 hover:text-indigo-600 transition-colors truncate block"
                                            >
                                                @{request.receiver?.username}
                                            </Link>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                                                Pending
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium truncate">
                                            {request.receiver?.targetRole || request.receiver?.bio || "Builder"}
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        <Button 
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleWithdraw(request)}
                                            disabled={withdrawingId === request._id}
                                            className="h-8 px-3 rounded-xl border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-[11px] font-bold gap-1 transition-all"
                                        >
                                            {withdrawingId === request._id ? (
                                                <Loader2 className="h-3 w-3 animate-spin text-rose-600" />
                                            ) : (
                                                <Undo2 className="h-3 w-3" />
                                            )}
                                            <span>Withdraw</span>
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">
                        Total Pending: {incoming.length + outgoing.length}
                    </span>
                    <Button 
                        onClick={() => setOpen(false)}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-black uppercase tracking-widest text-[10px] py-2 px-5 rounded-xl shadow-xs"
                    >
                        Minimize Hub
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SynergyRequests;
