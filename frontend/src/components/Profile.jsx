import useGetUserProfile from '@/hooks/useGetUserProfile';
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { setAuthUser, updateUserProfile } from '@/redux/authSlice';
import { Heart, MessageCircle, LayoutDashboard, Zap, Award, BookMarked, Bookmark, Briefcase, DollarSign, Github, Globe, FileText, Sparkles } from "lucide-react";
import { toast } from 'sonner';
import axios from "axios";
import NetworkListDialog from './NetworkListDialog';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Post from "./Post";

const Profile = () => {
    const params = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const userId = params.id;
    const { fetchUserProfile } = useGetUserProfile(userId);
    const dispatch = useDispatch();
    const { userProfile, user } = useSelector((state) => state.auth);
    const [activeTab, setActiveTab] = useState('posts');
    const [networkOpen, setNetworkOpen] = useState(false);
    const [networkType, setNetworkType] = useState('');
    const [networkUserIds, setNetworkUserIds] = useState([]);
    const [activePost, setActivePost] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState("none"); // none, pending, accepted
    const [connectionRequestId, setConnectionRequestId] = useState(null);
    const [isRequestSender, setIsRequestSender] = useState(false);

    // Auto-close overlay dialogs on route navigation
    React.useEffect(() => {
        setActivePost(null);
        setNetworkOpen(false);
    }, [location.pathname]);

    const fetchConnectionStatus = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/synergy/status/${userId}`, { withCredentials: true });
            if (res.data.success) {
                setConnectionStatus(res.data.status);
                setConnectionRequestId(res.data.request?._id);
                const senderId = res.data.request?.sender?._id || res.data.request?.sender;
                setIsRequestSender(String(senderId) === String(user?._id));
            }
        } catch (error) {
            console.error("Error fetching connection status:", error);
        }
    };

    const fetchAuthUser = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/${user?._id}/profile`, { withCredentials: true });
            if (res.data.success) {
                dispatch(setAuthUser(res.data.user));
            }
        } catch (error) {
            console.error("Error refreshing auth user:", error);
        }
    };

    const isloggedIn = user?._id && userProfile?._id && user._id === userProfile._id;

    const { socket } = useSelector(state => state.socketio);

    React.useEffect(() => {
        if (socket) {
            const handleNotification = (notif) => {
                const synergyTypes = ["connectionRequest", "connectionAccepted", "connectionWithdrawn", "connectionRemoved"];
                if (synergyTypes.includes(notif.type) && notif.userId === userId) {
                    fetchConnectionStatus();
                    fetchUserProfile(); 
                    fetchAuthUser(); // ALSO REFRESH LOGGED IN USER DATA FOR DASHBOARD
                    if (notif.type === "connectionAccepted") {
                        dispatch(markSynergyNotificationsSeen());
                    }
                }
            };
            socket.on("notification", handleNotification);
            return () => socket.off("notification", handleNotification);
        }
    }, [socket, userId]);

    React.useEffect(() => {
        if (userId && !isloggedIn) {
            fetchConnectionStatus();
        }
    }, [userId, isloggedIn]);


    if (!userProfile) {
        return (
            <div className="pt-40 text-center glass-card max-w-sm mx-auto p-10 mt-20">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Synchronizing Profile Data...</p>
            </div>
        );
    }

    const handleRemoveSynergy = async () => {
        try {
            const res = await axios.delete(
                `${import.meta.env.VITE_API_URL}/user/synergy/remove/${userProfile._id}`,
                { withCredentials: true }
            );

            if (res.data.success) {
                toast.success(res.data.message);
                setConnectionStatus("none");
                dispatch(markSynergyNotificationsSeen());
                // Robust state update for both users
                const authUserFollowing = (user.following || []).filter(id => String(id?._id || id) !== String(userProfile?._id));
                const authUserFollowers = (user.followers || []).filter(id => String(id?._id || id) !== String(userProfile?._id));
                
                dispatch(setAuthUser({ 
                    ...user, 
                    following: authUserFollowing,
                    followers: authUserFollowers
                }));

                const profileFollowers = (userProfile.followers || []).filter(id => String(id?._id || id) !== String(user?._id));
                const profileFollowing = (userProfile.following || []).filter(id => String(id?._id || id) !== String(user?._id));

                dispatch(updateUserProfile({ 
                    ...userProfile, 
                    followers: profileFollowers,
                    following: profileFollowing
                }));
                fetchAuthUser(); // Refresh dashboard counts
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Termination failed");
        }
    };

    const handleAccept = async () => {
        try {
            // If connectionRequestId is missing, try to fetch it first
            let finalRequestId = connectionRequestId;
            if (!finalRequestId) {
                const statusRes = await axios.get(`${import.meta.env.VITE_API_URL}/user/synergy/status/${userId}`, { withCredentials: true });
                finalRequestId = statusRes.data.request?._id;
            }

            if (!finalRequestId) {
                throw new Error("No pending request ID found");
            }

            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/user/synergy/accept/${finalRequestId}`,
                {},
                { withCredentials: true }
            );
            if (res.data.success) {
                toast.success(res.data.message);
                setConnectionStatus("accepted");
                dispatch(markSynergyNotificationsSeen());

                // Use robust returned data from server if available
                if (res.data.sender && res.data.receiver) {
                    const isSenderBeingViewed = String(res.data.sender._id) === String(userId);
                    const viewedUser = isSenderBeingViewed ? res.data.sender : res.data.receiver;
                    const loggedInUser = isSenderBeingViewed ? res.data.receiver : res.data.sender;

                    dispatch(updateUserProfile(viewedUser));
                    dispatch(setAuthUser(loggedInUser));
                } else {
                    // Fallback to structural refresh
                    fetchUserProfile();
                    fetchAuthUser();
                }
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || "Accept failed");
        }
    };

    const handleWithdraw = async () => {
        try {
            const res = await axios.delete(
                `${import.meta.env.VITE_API_URL}/user/synergy/withdraw/${userProfile._id}`,
                { withCredentials: true }
            );

            if (res.data.success) {
                toast.success(res.data.message);
                setConnectionStatus("none");
                setIsRequestSender(false);
                dispatch(markSynergyNotificationsSeen());
                fetchAuthUser(); // Refresh dashboard counts
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Withdrawal failed");
        }
    };

    const handleFollow = async () => {
        try {
            if (connectionStatus === "accepted") {
                // Legacy unfollow logic (optional: refactor to synergy/disconnect)
                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL}/user/followorunfollow/${userProfile._id}`,
                    {},
                    { headers: { "Content-Type": "application/json" }, withCredentials: true }
                );
                if (res.data.success) {
                    toast.success(res.data.message);
                    setConnectionStatus("none");
                    // Refresh profile data
                    dispatch(setAuthUser({ ...user, following: user.following.filter(id => id !== userProfile._id) }));
                }
                return;
            }

            // Send new synergy request
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/user/synergy/request/${userProfile._id}`,
                {},
                { headers: { "Content-Type": "application/json" }, withCredentials: true }
            );

            if (res.data.success) {
                toast.success(res.data.message);
                setConnectionStatus("pending");
                setIsRequestSender(true);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Synergy request failed");
        }
    };

    const displayPosts = (activeTab === 'posts'
        ? [...(userProfile?.posts || [])]
        : [...(userProfile?.bookmarks || [])]
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const isFollowingNow = user?.following?.includes(userProfile?._id);

    return (
        <div className="min-h-screen w-full max-w-5xl mx-auto px-2 sm:px-4 py-6 lg:py-10">
            <div className="flex flex-col gap-10 w-full">
                {/* Profile Header Card */}
                <div className="glass-card p-6 sm:p-8 lg:p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <Award className="h-48 w-48 text-indigo-600" />
                    </div>

                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 lg:gap-12 relative z-10 w-full min-w-0">
                        <div className="relative p-1 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl shrink-0">
                            <Avatar className="h-28 w-28 sm:h-36 sm:w-36 md:h-40 md:w-40 rounded-[22px] border-4 border-white shadow-2xl overflow-hidden">
                                <AvatarImage
                                    src={userProfile?.profilepicture || "https://github.com/shadcn.png"}
                                    className="object-cover w-full h-full"
                                />
                                <AvatarFallback className="bg-slate-100 text-slate-800 text-4xl font-black">
                                    {userProfile?.username?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                                <Zap className="h-4 w-4 fill-white" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-5 flex-1 min-w-0 text-center md:text-left w-full">
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full">
                                    <div className="flex flex-col min-w-0">
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                                            {userProfile?.name || userProfile?.username}
                                        </h1>
                                        <p className="text-sm md:text-base font-bold text-indigo-600 mt-0.5">
                                            {userProfile?.username?.startsWith('@') ? userProfile?.username : `@${userProfile?.username}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center flex-wrap gap-2 shrink-0 justify-center md:justify-start sm:justify-end pt-1">
                                        {!isloggedIn ? (
                                            <div className="flex items-center flex-wrap gap-2">
                                                <Button
                                                    onClick={
                                                        connectionStatus === "accepted"
                                                            ? handleRemoveSynergy
                                                            : connectionStatus === "pending" 
                                                                ? isRequestSender ? handleWithdraw : handleAccept 
                                                                : handleFollow
                                                    }
                                                    className={`font-black uppercase tracking-widest text-[10px] px-5 py-2 rounded-xl transition-all shadow-md shrink-0 ${
                                                        connectionStatus === "none"
                                                            ? "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5"
                                                            : connectionStatus === "pending"
                                                            ? isRequestSender 
                                                                ? "bg-amber-50 text-amber-600 border border-amber-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100" 
                                                                : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white"
                                                            : "bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                                                    }`}
                                                >
                                                    {connectionStatus === "accepted" 
                                                        ? "Remove Synergy" 
                                                        : connectionStatus === "pending" 
                                                            ? isRequestSender ? "Withdraw Sync" : "Accept Synergy" 
                                                            : "Sync Profile"}
                                                </Button>
                                                {connectionStatus === "accepted" && (
                                                    <Button
                                                        onClick={() => navigate("/chat")}
                                                        className="font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-md shrink-0"
                                                    >
                                                        Secure Link
                                                    </Button>
                                                )}
                                                <Link to={`/resume/${userProfile?._id}`}>
                                                    <Button
                                                        variant="outline"
                                                        className="font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl border border-purple-200 text-purple-700 bg-purple-50/70 hover:bg-purple-100 transition-all flex items-center gap-1.5 shadow-sm shrink-0 whitespace-nowrap"
                                                    >
                                                        <FileText className="h-3.5 w-3.5 text-purple-600 shrink-0" /> View Resume
                                                    </Button>
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="flex items-center flex-wrap gap-2">
                                                <Link to="/account/edit">
                                                    <Button variant="outline" className="font-black uppercase tracking-widest text-[10px] px-4 sm:px-5 py-2 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm shrink-0 whitespace-nowrap">
                                                        Edit Portfolio
                                                    </Button>
                                                </Link>
                                                <Link to={`/resume/${userProfile?._id}`}>
                                                    <Button variant="default" className="font-black uppercase tracking-widest text-[10px] px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                                                        <FileText className="h-3.5 w-3.5 text-white shrink-0" /> My AI Resume
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {(userProfile?.resume_data?.headline || userProfile?.targetRole) && (
                                    <p className="text-slate-700 font-bold tracking-tight text-sm md:text-base">
                                        {userProfile?.resume_data?.headline || userProfile?.targetRole}
                                    </p>
                                )}

                                {((userProfile?.resume_data?.skills || userProfile?.skills || []).length > 0 || userProfile?.githubProfile || userProfile?.portfolioUrl) && (
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                                        {(userProfile?.resume_data?.skills || userProfile?.skills || []).slice(0, 8).map((skill, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50/80 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                                                <Sparkles className="h-3 w-3 text-indigo-400" />
                                                {skill}
                                            </span>
                                        ))}
                                        {userProfile?.githubProfile && (
                                            <a
                                                href={userProfile.githubProfile.startsWith('http') ? userProfile.githubProfile : `https://${userProfile.githubProfile}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-all shadow-sm"
                                            >
                                                <Github className="h-3.5 w-3.5" />
                                                GitHub
                                            </a>
                                        )}
                                        {userProfile?.portfolioUrl && (
                                            <a
                                                href={userProfile.portfolioUrl.startsWith('http') ? userProfile.portfolioUrl : `https://${userProfile.portfolioUrl}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold transition-all shadow-sm"
                                            >
                                                <Globe className="h-3.5 w-3.5" />
                                                Portfolio
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-8">
                                {[
                                    { label: 'Transmissions', count: userProfile?.posts?.length || 0, type: 'posts' },
                                    { label: 'Synergy Hub', count: userProfile?.followers?.length || 0, type: 'followers', data: userProfile?.followers || [] },
                                    { label: 'Directed Link', count: userProfile?.following?.length || 0, type: 'following', data: userProfile?.following || [] }
                                ].map((stat, i) => (
                                    <div 
                                      key={`${stat.label}-${stat.count}`} 
                                      className={`flex flex-col items-center md:items-start group/stat ${stat.type !== 'posts' ? 'cursor-pointer' : ''}`}
                                      onClick={() => {
                                        if (stat.type !== 'posts') {
                                          setNetworkType(stat.label);
                                          setNetworkUserIds(stat.data || []);
                                          setNetworkOpen(true);
                                        }
                                      }}
                                    >
                                        <span className="text-xl font-black text-slate-900 group-hover/stat:text-indigo-600 transition-colors uppercase tracking-tight">{stat.count}</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</span>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </div>

                {/* Tab Navigation Content */}
                <div className="flex flex-col gap-8 w-full">
                    <div className="flex items-center justify-center gap-12 border-b border-slate-100">
                        {[
                            { id: 'posts', label: 'PORTFOLIO DATA', icon: <LayoutDashboard className="h-3 w-3" /> },
                            { id: 'saved', label: 'SAVED ASSETS', icon: <Bookmark className="h-3 w-3" /> }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 pb-4 transition-all relative ${
                                    activeTab === tab.id
                                        ? "text-indigo-600"
                                        : "text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                {tab.icon}
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Posts Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
                        {displayPosts?.map((post) => (
                            <div 
                                key={post._id} 
                                onClick={() => setActivePost(post)}
                                className="relative group aspect-square overflow-hidden rounded-2xl glass-card transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl cursor-pointer"
                            >
                                <img
                                    src={post.image}
                                    alt="Portfolio Asset"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />

                                {/* Overlay on hover */}
                                <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300 flex justify-center items-center">
                                    <div className="flex gap-6 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        <div className="flex items-center gap-2 drop-shadow-md">
                                            <Heart className="h-5 w-5 fill-white" />
                                            <span className="font-black text-sm">{post?.likes?.length}</span>
                                        </div>
                                        <div className="flex items-center gap-2 drop-shadow-md">
                                            <MessageCircle className="h-5 w-5 fill-white" />
                                            <span className="font-black text-sm">{post?.comments?.length}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <NetworkListDialog open={networkOpen} setOpen={setNetworkOpen} title={networkType} userIds={networkUserIds} />
            
            <Dialog open={!!activePost} onOpenChange={(open) => !open && setActivePost(null)}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none shadow-none hide-scrollbar">
                    {activePost && <Post post={activePost} />}
                </DialogContent>
            </Dialog>
        </div>
    );
};


export default Profile;
