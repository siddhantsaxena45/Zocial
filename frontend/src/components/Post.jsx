import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { 
    Bookmark, MessageCircle, MoreHorizontal, Send, Zap, Users, TrendingUp, 
    Github, ExternalLink, Sparkles, Handshake, Check, Copy, 
    Code, CheckCircle2, ShieldCheck, Play, Eye, ChevronDown, ChevronUp, Briefcase 
} from 'lucide-react'

import { FaBookmark, FaHeart, FaRegHeart } from "react-icons/fa";

import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from './ui/button'
import CommentDialog from './CommentDialog';
import LikesDialog from './LikesDialog';
import { useDispatch, useSelector } from 'react-redux';
import { setPosts, setSelectedPost, setEngagementModalOpen } from '@/redux/postSlice';
import axios from 'axios';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { updateBookmarks } from '@/redux/authSlice';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const formatHandle = (raw) => {
    if (!raw) return "@builder";
    const trimmed = String(raw).trim();
    if (trimmed.startsWith("@")) return trimmed;
    return `@${trimmed.toLowerCase().replace(/\s+/g, '')}`;
};

const Post = ({ post }) => {
    const authorHandle = formatHandle(post.author?.username);
    const authorInitial = authorHandle.replace(/^@/, '')[0]?.toUpperCase() || 'U';
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { user } = useSelector(state => state.auth)
    const { posts } = useSelector(state => state.post)
    const [text, setText] = useState("")
    const [open, setOpen] = useState(false)
    const [openLikes, setOpenLikes] = useState(false)
    const [isCaptionExpanded, setIsCaptionExpanded] = useState(false)
    const [isEditingCaption, setIsEditingCaption] = useState(false)
    const [editedCaptionText, setEditedCaptionText] = useState(post.caption || "")
    const [isSavingCaption, setIsSavingCaption] = useState(false)
    
    // Interactive Artifact & Proof-of-Work State
    const [showCode, setShowCode] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [sandboxOpen, setSandboxOpen] = useState(false);
    const [vouchStatus, setVouchStatus] = useState(post.vouchStatus || "none");
    const [vouchLoading, setVouchLoading] = useState(false);

    // Auto-close overlay dialogs on route navigation
    const location = useLocation();
    React.useEffect(() => {
        setOpen(false);
        setOpenLikes(false);
    }, [location.pathname]);
    
    // Check if the user has liked the post (accommodates string IDs or populated objects)
    const userHasLiked = post.likes.some(like => (like._id || like) === user._id);
    const [isliked, setIsLiked] = useState(userHasLiked)
    const [postlikes, setPostLikes] = useState(post.likes.length)

    // Check if the logged-in user is designated as collaborator (by ObjectId or username)
    const isDesignatedCollaborator = user && (
        (post.collaborator && (post.collaborator._id || post.collaborator).toString() === user._id?.toString()) ||
        (post.vouchedBy && (post.vouchedBy._id || post.vouchedBy).toString() === user._id?.toString()) ||
        (post.collaboratorUsername && user.username?.toLowerCase() === post.collaboratorUsername.toLowerCase())
    );

    const handleVouch = async (action) => {
        try {
            setVouchLoading(true);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/post/${post._id}/vouch`, { action }, { withCredentials: true });
            if (res.data.success) {
                setVouchStatus(res.data.post.vouchStatus);
                toast.success(res.data.message);
                const updatedPosts = posts.map(p => p._id === post._id ? { ...p, vouchStatus: res.data.post.vouchStatus } : p);
                dispatch(setPosts(updatedPosts));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update vouch");
        } finally {
            setVouchLoading(false);
        }
    };

    const copyCodeHandler = () => {
        if (!post.codeSnippet) return;
        navigator.clipboard.writeText(post.codeSnippet);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
        toast.success("Code snippet copied to clipboard");
    };
    


    const isAuthor = user && (user._id === post.author?._id || user._id === post.author);

    const handleChange = (e) => {
        let inputText = e.target.value
        if (inputText.trim()) {
            setText(inputText)
        } else {
            setText("")
        }
    }
    const deletePostHandler = async (id) => {
        try {
            const res = await axios.delete(`${import.meta.env.VITE_API_URL}/post/delete/${id}`, { withCredentials: true })

            if (res.data.success) {
                const newPosts = posts.filter(postitem => postitem._id !== id)
                dispatch(setPosts(newPosts))
                toast.success(res.data.message)
            }

        } catch (err) {
            toast.error(err.response.data.message)
        }
    }

    const saveCaptionHandler = async () => {
        try {
            setIsSavingCaption(true)
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/post/edit/${post._id}`, { caption: editedCaptionText }, { withCredentials: true })

            if (res.data.success) {
                const updatedPost = res.data.post;
                const updatedPosts = posts.map(p => p._id === post._id ? { ...p, caption: updatedPost.caption } : p);
                dispatch(setPosts(updatedPosts));
                setIsEditingCaption(false);
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to edit caption");
        } finally {
            setIsSavingCaption(false)
        }
    }
    const likeordislike = async (id) => {
        try {
            const action = isliked ? "dislike" : "like"
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/post/${id}/${action}`, { withCredentials: true })
            if (res.data.success) {
                let updatedlikes = isliked ? postlikes - 1 : postlikes + 1
                let updatedPosts = posts.map(postitem => {
                    if (postitem._id === id) {
                        if (isliked) {
                            return { ...postitem, likes: postitem.likes.filter(like => (like._id || like) !== user._id) }
                        } else {
                            const newUserLike = { _id: user._id, username: user.username, profilepicture: user.profilepicture };
                            return { ...postitem, likes: [...postitem.likes, newUserLike] }
                        }
                    }
                    return postitem
                })
                dispatch(setPosts(updatedPosts))
                setIsLiked(!isliked)
                setPostLikes(updatedlikes)
                toast.success(res.data.message)
            }

        }

        catch (err) {
            toast.error(err.response.data.message)
        }
    }

const handleShare = async (imageUrl) => {
    try {
        await navigator.clipboard.writeText(imageUrl);
        toast.success("Post link copied to clipboard!");
    } catch (err) {
        toast.error("Failed to copy post link");
    }
};


    const commentHandler = async () => {
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/post/${post._id}/comment`,
                { comment: text },
                {
                    headers: { "Content-Type": "application/json" },
                    withCredentials: true,
                }
            );

            if (res.data.success) {
                const newComment = res.data.comment;

                // Create a new post object with the added comment
                const updatedPost = {
                    ...post,
                    comments: [...post.comments, newComment],
                };

                // Update global posts state
                const updatedPosts = posts.map((p) =>
                    p._id === post._id ? updatedPost : p
                );

                dispatch(setPosts(updatedPosts));

                setText("");
                toast.success(res.data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to comment");
        }
    };

    const bookmarkHandler = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/post/${post._id}/bookmark`, { withCredentials: true })
            if (res.data.success) {
                // Update the Redux posts array
                const updatedBookmarks = res.data.bookmarks;

                // Update Redux user state
                dispatch(updateBookmarks(updatedBookmarks));

                toast.success(res.data.message);
            }
        }
        catch (error) {
            toast.error(error.response.data.message)
        }
    };

    return (
        <div className="glass-card w-full overflow-hidden max-w-2xl mx-auto mb-10 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] group/post">
            {/* Post header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white/40 backdrop-blur-md border-b border-indigo-50/50">
                <div className="flex items-center gap-4">
                    <Link to={`/profile/${post.author?._id}`} className="cursor-pointer relative block">
                        <Avatar className="h-10 w-10 border border-slate-200">
                            <AvatarImage src={post.author?.profilepicture || "https://github.com/shadcn.png"} alt="profile_image" />
                            <AvatarFallback>
                                {authorInitial}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className='flex flex-col justify-center'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <Link to={`/profile/${post.author?._id}`} className="text-base font-black text-slate-900 tracking-tight hover:text-indigo-600 transition-colors">
                                {authorHandle}
                            </Link>
                        </div>
                    </div>
                </div>


                <div className="flex items-center gap-2">
                    {isAuthor && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-white/50 transition-all">
                                    <MoreHorizontal className="h-6 w-6 text-slate-400 group-hover/post:text-slate-600" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="flex flex-col items-center p-3 sm:max-w-[240px] border border-white/20 shadow-2xl bg-white/80 backdrop-blur-xl">
                                <Button 
                                    variant="ghost" 
                                    className="w-full justify-center hover:bg-slate-50 font-bold rounded-xl py-6 border-b border-slate-100" 
                                    onClick={() => { setIsEditingCaption(true); setEditedCaptionText(post.caption || ""); }}
                                >
                                    Edit Caption
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="w-full justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-bold rounded-xl py-6" 
                                    onClick={() => deletePostHandler(post._id)}
                                >
                                    Delete Transmission
                                </Button>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* Post image/content */}
            <div className="relative group overflow-hidden bg-slate-950 aspect-[4/5] sm:aspect-square">
                <img
                    className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 group-hover:brightness-90"
                    src={post.image}
                    alt="Network Asset"
                    loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>

            {/* Action Bar */}
            <div className='px-5 py-4 bg-white/20 backdrop-blur-sm'>

                <div className='flex items-center justify-between mb-3'>
                    <div className='flex gap-5 items-center'>
                        <div className="flex items-center gap-1.5 group">
                            {isliked ? (
                                <FaHeart 
                                    className='text-2xl text-rose-500 cursor-pointer transition-all active:scale-150 hover:scale-110 drop-shadow-sm' 
                                    onClick={() => likeordislike(post._id)} 
                                />
                            ) : (
                                <FaRegHeart 
                                    className='text-2xl text-slate-700 cursor-pointer transition-all active:scale-150 hover:scale-110 hover:text-rose-500' 
                                    onClick={() => likeordislike(post._id)} 
                                />
                            )}
                            {postlikes > 0 && (
                                <span 
                                    onClick={() => { dispatch(setSelectedPost(post)); dispatch(setEngagementModalOpen(true)); }}
                                    className="text-xs font-black text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors"
                                >
                                    {postlikes}
                                </span>
                            )}
                        </div>

                        <div className="group transition-colors hover:text-blue-500">
                            <MessageCircle 
                                onClick={() => { setOpen(true); dispatch(setSelectedPost(post)); }} 
                                className='h-6 w-6 text-gray-700 cursor-pointer transition-transform hover:scale-110' 
                            />
                        </div>
                        
                        <div className="group transition-colors hover:text-emerald-500">
                            <Send 
                                onClick={() => handleShare(post.image)} 
                                className="h-6 w-6 text-gray-700 cursor-pointer transition-transform hover:scale-110" 
                            />
                        </div>
                    </div>

                    <div className="group">
                        {user?.bookmarks?.includes(post._id) ? (
                            <FaBookmark 
                                className='text-2xl text-purple-600 cursor-pointer transition-transform hover:scale-110' 
                                onClick={bookmarkHandler} 
                            />
                        ) : (
                            <Bookmark 
                                className='h-6 w-6 text-gray-700 cursor-pointer transition-transform hover:scale-110 hover:text-purple-400' 
                                onClick={bookmarkHandler} 
                            />
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className='space-y-3 px-1'>
                    <div className='flex items-center gap-2'>
                        <div 
                            className="flex -space-x-2.5 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => { dispatch(setSelectedPost(post)); dispatch(setEngagementModalOpen(true)); }}
                        >
                             {[1,2,3].map(i => (
                                <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center shadow-sm">
                                    <Users className="h-[10px] w-[10px] text-indigo-400" />
                                </div>
                             ))}
                        </div>
                        <span 
                            onClick={() => { dispatch(setSelectedPost(post)); dispatch(setEngagementModalOpen(true)); }} 
                            className='cursor-pointer hover:underline decoration-slate-300 underline-offset-4 decoration-2 text-[13px] font-black text-slate-800 tracking-tight transition-all'
                        >
                            {postlikes.toLocaleString()} Professional Engagements
                        </span>
                    </div>

                    <div className='text-sm leading-snug text-slate-700 font-medium'>
                        <span className='font-black mr-2 text-indigo-700'>{authorHandle}</span>
                        {isEditingCaption ? (
                            <div className="mt-2 flex flex-col gap-2 w-full">
                                <textarea 
                                    value={editedCaptionText}
                                    onChange={(e) => setEditedCaptionText(e.target.value)}
                                    className="w-full bg-white border border-indigo-100 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-300 resize-none shadow-inner"
                                    rows={3}
                                />
                                <div className="flex items-center gap-2 self-end">
                                    <button 
                                        onClick={() => setIsEditingCaption(false)}
                                        className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={saveCaptionHandler}
                                        disabled={isSavingCaption}
                                        className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                                    >
                                        {isSavingCaption ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <span className='opacity-90'>
                                    {isCaptionExpanded || !post.caption || post.caption.length <= 80
                                        ? post.caption
                                        : `${post.caption.slice(0, 80)}...`}
                                </span>
                                {post.caption && post.caption.length > 80 && (
                                    <button 
                                        onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
                                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors ml-1"
                                    >
                                        {isCaptionExpanded ? "less" : "more"}
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* 🛠️ Proof-of-Work & Synergy Artifacts */}
                    {(post.tags?.length > 0 || post.githubUrl || post.liveUrl || post.codeSnippet || post.collaboratorUsername) && (
                        <div className="pt-2 pb-1 space-y-2 border-t border-slate-100/80">
                            {/* Tech Stack Tags */}
                            {post.tags && post.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {post.tags.map((tag, idx) => (
                                        <span key={idx} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 rounded-md">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Artifact Links & Actions */}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                {post.githubUrl && (
                                    <a
                                        href={post.githubUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-2.5 py-1 rounded-lg transition-all"
                                    >
                                        <Github className="h-3 w-3" />
                                        <span>Live Code Repo</span>
                                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                    </a>
                                )}

                                {post.liveUrl && (
                                    <button
                                        onClick={() => setSandboxOpen(true)}
                                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-all"
                                    >
                                        <Sparkles className="h-3 w-3 text-indigo-500" />
                                        <span>Interactive Sandbox</span>
                                        <Eye className="h-2.5 w-2.5 opacity-60" />
                                    </button>
                                )}

                                {post.codeSnippet && (
                                    <button
                                        onClick={() => setShowCode(!showCode)}
                                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg transition-all"
                                    >
                                        <Code className="h-3 w-3 text-indigo-600" />
                                        <span>Inspect Code ({post.codeLanguage || 'js'})</span>
                                        {showCode ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                                    </button>
                                )}

                                {/* Peer Verified Synergy Badge */}
                                {vouchStatus === "accepted" && post.collaboratorUsername && (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg shadow-sm">
                                        <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                                        <span>Peer-Verified Synergy with {formatHandle(post.collaboratorUsername)}</span>
                                    </span>
                                )}

                                {vouchStatus !== "accepted" && post.collaboratorUsername && (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-lg">
                                        <Handshake className="h-3.5 w-3.5 text-purple-600" />
                                        <span>Synergy with {formatHandle(post.collaboratorUsername)}</span>
                                    </span>
                                )}
                            </div>

                            {/* Peer Vouch Request Action for Designated Collaborator */}
                            {isDesignatedCollaborator && vouchStatus === "pending" && (
                                <div className="w-full p-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl space-y-1.5 mt-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                                            <Handshake className="h-4 w-4 text-purple-600" />
                                            {authorHandle} tagged you as {post.collaboratorRole || 'Co-Developer'}. Vouch for this synergy?
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleVouch('accept')}
                                            disabled={vouchLoading}
                                            className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-sm"
                                        >
                                            {vouchLoading ? "Verifying..." : "Vouch for Project"}
                                        </button>
                                        <button
                                            onClick={() => handleVouch('decline')}
                                            disabled={vouchLoading}
                                            className="text-[10px] font-bold text-slate-500 hover:text-red-600 px-2 py-1"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Code Snippet Inspector Box */}
                            {showCode && post.codeSnippet && (
                                <div className="mt-2 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-slate-400 text-[11px]">
                                        <span className="font-mono font-bold text-emerald-400 uppercase tracking-widest text-[10px]">
                                            {post.codeLanguage || 'javascript'} artifact
                                        </span>
                                        <button
                                            onClick={copyCodeHandler}
                                            className="hover:text-white flex items-center gap-1 transition-colors text-[10px]"
                                        >
                                            {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                            {copiedCode ? "Copied!" : "Copy"}
                                        </button>
                                    </div>
                                    <pre className="p-3 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-56 leading-relaxed">
                                        <code>{post.codeSnippet}</code>
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Live Sandbox Preview Dialog */}
                    {post.liveUrl && (
                        <Dialog open={sandboxOpen} onOpenChange={setSandboxOpen}>
                            <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 flex flex-col rounded-2xl overflow-hidden bg-white shadow-2xl">
                                <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                                    <DialogTitle className="text-sm font-black flex items-center gap-2 text-slate-900">
                                        <Sparkles className="h-4 w-4 text-indigo-600" /> Live Interactive Sandbox
                                    </DialogTitle>
                                    <a
                                        href={post.liveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mr-6"
                                    >
                                        Open External <ExternalLink className="h-3 w-3" />
                                    </a>
                                </DialogHeader>
                                <div className="flex-1 w-full h-full bg-slate-50 relative">
                                    <iframe
                                        src={post.liveUrl}
                                        title="Live Artifact Preview"
                                        className="w-full h-full border-none"
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                    />
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

                    {post.comments.length > 0 && (
                        <button 
                            onClick={() => { dispatch(setSelectedPost(post)); setOpen(true); }} 
                            className='w-full text-left p-3 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 transition-colors border border-indigo-100/50 group/insights'
                        >
                            <span className='text-xs font-bold text-indigo-600 group-hover/insights:text-indigo-800 transition-colors flex items-center gap-2'>
                                <TrendingUp className="h-3 w-3" />
                                View all {post.comments.length} professional insights
                            </span>
                        </button>
                    )}
                </div>

                <CommentDialog open={open} setOpen={setOpen} />
                <LikesDialog open={openLikes} setOpen={setOpenLikes} likes={post.likes} />

                {/* Comment Input */}
                <div className='mt-4 pt-4 border-t border-slate-100 flex items-center gap-3'>
                    <div className="h-9 w-9 rounded-xl glass-card flex-shrink-0 overflow-hidden p-0.5">
                        <img src={user?.profilepicture || "https://github.com/shadcn.png"} alt="me" className="w-full h-full object-cover rounded-[10px]" />
                    </div>
                    <div className="flex-1 relative">
                        <input
                            onChange={handleChange}
                            name="comment"
                            value={text}
                            type="text" 
                            placeholder='Add a professional insight...' 
                            className='w-full text-sm bg-slate-50/50 hover:bg-slate-100/50 focus:bg-white border-none rounded-xl px-4 py-2.5 outline-none transition-all placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-200' 
                        />
                    </div>
                    <button 
                        disabled={!text.trim()} 
                        onClick={commentHandler}
                        className={`text-sm font-black px-4 py-2 rounded-xl transition-all ${text.trim() ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-lg hover:bg-indigo-700' : 'bg-slate-100 text-slate-300 pointer-events-none'}`}
                    >
                        Publish
                    </button>
                </div>
            </div>
        </div>

    );

}

export default Post
