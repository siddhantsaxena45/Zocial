import React, { useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { readFileAsDataURL } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, Camera, User, ChevronRight, Sparkles, Github, Globe, FileText, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { setAuthUser } from '@/redux/authSlice';
import axios from 'axios';

const EditProfile = () => {
    const { user } = useSelector(state => state.auth);
    const [loading, setLoading] = useState(false);
    const imageRef = useRef();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    
    const [inputData, setInputData] = useState({
        name: user?.name || "",
        username: user?.username || "",
        profilephoto: user?.profilepicture || "",
        gender: user?.gender || "",
        githubProfile: user?.githubProfile || "",
        portfolioUrl: user?.portfolioUrl || ""
    });
    
    const [preview, setPreview] = useState(user?.profilepicture || "");

    // Synchronize state if user data loads late
    useEffect(() => {
        if (user) {
            setInputData({
                name: user.name || "",
                username: user.username || "",
                profilephoto: user.profilepicture || "",
                gender: user.gender || "",
                githubProfile: user.githubProfile || "",
                portfolioUrl: user.portfolioUrl || ""
            });
            setPreview(user.profilepicture);
        }
    }, [user]);

    const fileHandler = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const previewUrl = await readFileAsDataURL(file);
            setPreview(previewUrl);
            setInputData({
                ...inputData,
                profilephoto: file
            });
        }
    };

    const selectChangeHandler = (value) => {
        setInputData({ ...inputData, gender: value });
    };

    const editProfileHandler = async (e) => {
        const formData = new FormData();
        if (inputData.profilephoto instanceof File) {
            formData.append("profilephoto", inputData.profilephoto);
        }
        formData.append("name", inputData.name);
        formData.append("username", inputData.username);
        formData.append("gender", inputData.gender);
        formData.append("githubProfile", inputData.githubProfile);
        formData.append("portfolioUrl", inputData.portfolioUrl);

        try {
            setLoading(true);
            let response = await axios.post(`${import.meta.env.VITE_API_URL}/user/profile/edit`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                withCredentials: true
            });
            if (response.data.success) {
                const updatedUser = {
                    ...user,
                    name: response.data.user.name,
                    username: response.data.user.username,
                    profilepicture: response.data.user.profilepicture,
                    gender: response.data.user.gender,
                    githubProfile: response.data.user.githubProfile,
                    portfolioUrl: response.data.user.portfolioUrl
                };
                dispatch(setAuthUser(updatedUser));
                navigate(`/profile/${user._id}`);
                toast.success("Identity Updated Successfully");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const aiHeadline = user?.resume_data?.headline || user?.targetRole || "";
    const aiSummary = user?.resume_data?.ai_summary || user?.ai_summary || "Gemini AI analyzes your project transmissions to automatically synthesize your career headline and resume.";

    return (
        <div className="min-h-screen w-full pt-24 pb-16 px-4 md:px-10 bg-slate-50/50">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Identity Management</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Refine Your Professional Presence</h1>
                    <p className="text-slate-500 text-sm font-medium">Your resume, career summary, and skill stack are synthesized automatically from your project transmissions.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Profile Card Preview */}
                    <div className="lg:col-span-1">
                        <div className="glass-card p-6 sticky top-24 border border-white/80 shadow-2xl shadow-indigo-100/20">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="relative group">
                                    <Avatar className="h-24 w-24 ring-4 ring-white shadow-xl">
                                        <AvatarImage src={preview || "https://github.com/shadcn.png"} className="object-cover" />
                                        <AvatarFallback className="bg-indigo-50 text-indigo-600 font-black text-2xl">
                                            {user?.username?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <button 
                                        onClick={() => imageRef.current.click()}
                                        className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-xl shadow-lg border-2 border-white hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                                    >
                                        <Camera className="h-4 w-4" />
                                    </button>
                                </div>
                                
                                <div>
                                    <h2 className="font-black text-lg text-slate-900 tracking-tight">{inputData.name || user?.name || user?.username}</h2>
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">
                                        {inputData.username ? (inputData.username.startsWith('@') ? inputData.username : `@${inputData.username}`) : (user?.username?.startsWith('@') ? user?.username : `@${user?.username}`)}
                                    </p>
                                </div>

                                <div className="w-full pt-4 border-t border-slate-100/50 text-left">
                                    <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                                        <Sparkles className="h-3 w-3" />
                                        <span className="text-[9px] font-black uppercase tracking-wider">AI Headline</span>
                                    </div>
                                    <p className="text-xs text-slate-800 font-bold leading-snug">
                                        {aiHeadline || "Generated automatically from project transmissions"}
                                    </p>
                                    <p className="text-[11px] text-slate-500 italic leading-relaxed mt-2 line-clamp-4">
                                        "{aiSummary}"
                                    </p>
                                </div>

                                <input type="file" onChange={fileHandler} className="hidden" ref={imageRef} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Edit Form */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Identity Section */}
                        <div className="glass-card p-8 border border-white/60 shadow-xl space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Identity Details</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Name & Unique @Handle</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Swati Saxena"
                                        value={inputData.name}
                                        onChange={(e) => setInputData({ ...inputData, name: e.target.value })}
                                        className="w-full bg-slate-50/50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unique Handle (@username)</label>
                                    <input
                                        type="text"
                                        placeholder="@swatisaxena"
                                        value={inputData.username}
                                        onChange={(e) => {
                                            let val = e.target.value.toLowerCase().replace(/[^a-z0-9_@]/g, "");
                                            if (val && !val.startsWith("@")) val = `@${val.replace(/@/g, "")}`;
                                            setInputData({ ...inputData, username: val });
                                        }}
                                        className="w-full bg-slate-50/50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* AI Autonomous Portfolio Status */}
                        <div className="glass-card p-6 border border-purple-100 bg-gradient-to-br from-purple-50/60 via-indigo-50/40 to-white shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-purple-100 pb-3 flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-md">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Autonomous AI Portfolio</h3>
                                        <p className="text-[10px] text-purple-600 font-bold uppercase tracking-widest">Synthesized from your transmissions</p>
                                    </div>
                                </div>
                                <Link to={`/resume/${user?._id}`}>
                                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1.5 h-8">
                                        <FileText className="h-3.5 w-3.5" /> View AI Resume <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current AI Headline:</span>
                                    <span className="text-xs font-bold text-slate-900">{aiHeadline}</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed italic bg-white/70 p-3 rounded-xl border border-purple-100/60">
                                    "{aiSummary}"
                                </p>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                                    <Sparkles className="h-3 w-3 text-purple-400" />
                                    No manual summary required. Every time you post technical proof-of-work, code snippets, or UI designs, Gemini AI automatically updates your skills, career headline, and resume.
                                </p>
                            </div>
                        </div>

                        {/* Professional Portals & Repositories */}
                        <div className="glass-card p-8 border border-white/60 shadow-xl space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <Globe className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Professional Portals</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">External Links & Code Repositories</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5">
                                        <Github className="h-3.5 w-3.5 text-slate-600" /> GitHub Profile
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://github.com/username"
                                        value={inputData.githubProfile}
                                        onChange={(e) => setInputData({ ...inputData, githubProfile: e.target.value })}
                                        className="w-full bg-slate-50/50 border border-slate-200/60 focus:ring-2 focus:ring-indigo-500 h-11 px-4 text-xs font-medium text-slate-800 rounded-xl shadow-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5">
                                        <Globe className="h-3.5 w-3.5 text-slate-600" /> Portfolio Website
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://yourportfolio.dev"
                                        value={inputData.portfolioUrl}
                                        onChange={(e) => setInputData({ ...inputData, portfolioUrl: e.target.value })}
                                        className="w-full bg-slate-50/50 border border-slate-200/60 focus:ring-2 focus:ring-indigo-500 h-11 px-4 text-xs font-medium text-slate-800 rounded-xl shadow-sm outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Gender/Metadata Section */}
                        <div className="glass-card p-8 border border-white/60 shadow-xl space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Demographic Metadata</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Business Identity Parameters</p>
                                </div>
                            </div>

                            <div className="max-w-xs">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Identity/Gender</label>
                                <Select value={inputData.gender} onValueChange={selectChangeHandler}>
                                    <SelectTrigger className="w-full bg-slate-50/50 border-slate-200/60 focus-visible:ring-indigo-500 h-11 rounded-xl shadow-sm">
                                        <SelectValue placeholder="Select demographic" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl">
                                        <SelectGroup>
                                            <SelectItem value="male" className="rounded-lg mb-1 focus:bg-indigo-50 cursor-pointer">Male Professional</SelectItem>
                                            <SelectItem value="female" className="rounded-lg focus:bg-indigo-50 cursor-pointer">Female Professional</SelectItem>
                                            <SelectItem value="other" className="rounded-lg focus:bg-indigo-50 cursor-pointer">Other Identity</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center justify-end pt-4">
                            <Button 
                                onClick={() => navigate(-1)}
                                variant="ghost"
                                className="mr-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 cursor-pointer"
                            >
                                Discard Changes
                            </Button>
                            
                            <Button 
                                onClick={editProfileHandler} 
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-2xl transition-all shadow-xl shadow-indigo-200 group active:scale-95 disabled:opacity-70 cursor-pointer"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span className="font-black text-[10px] uppercase tracking-widest">Synchronizing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-black text-[10px] uppercase tracking-widest">Deploy Changes</span>
                                        <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfile;
