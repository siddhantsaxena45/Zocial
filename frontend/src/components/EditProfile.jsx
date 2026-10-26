import React, { useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { readFileAsDataURL } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, Camera, User, FileText, ChevronRight, Sparkles, Github, Globe, Briefcase, DollarSign, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
        bio: user?.bio || "",
        gender: user?.gender || "",
        openToOpportunities: user?.openToOpportunities || false,
        targetRole: user?.targetRole || "",
        hourlyRate: user?.hourlyRate || "",
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
                profilephoto: user.profilepicture,
                bio: user.bio || "",
                gender: user.gender || "",
                openToOpportunities: user.openToOpportunities || false,
                targetRole: user.targetRole || "",
                hourlyRate: user.hourlyRate || "",
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
    }

    const editProfileHandler = async (e) => {
        const formData = new FormData();
        if (inputData.profilephoto instanceof File) {
            formData.append("profilephoto", inputData.profilephoto);
        }
        formData.append("name", inputData.name);
        formData.append("username", inputData.username);
        formData.append("bio", inputData.bio);
        formData.append("gender", inputData.gender);
        formData.append("openToOpportunities", inputData.openToOpportunities ? "true" : "false");
        formData.append("targetRole", inputData.targetRole);
        formData.append("hourlyRate", inputData.hourlyRate);
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
                    bio: response.data.user.bio,
                    gender: response.data.user.gender,
                    openToOpportunities: response.data.user.openToOpportunities,
                    targetRole: response.data.user.targetRole,
                    hourlyRate: response.data.user.hourlyRate,
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
                    <p className="text-slate-500 text-sm font-medium">Update your digital identity and AI-facing metadata.</p>
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
                                        className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-xl shadow-lg border-2 border-white hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95"
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

                                <div className="w-full pt-4 border-t border-slate-100/50">
                                    <p className="text-xs text-slate-500 italic leading-relaxed px-2">
                                        "{inputData.bio || "Crafting a unique professional narrative..."}"
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
                        
                        {/* Bio Section */}
                        <div className="glass-card p-8 border border-white/60 shadow-xl space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Professional Summary</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Bio & Intent</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Textarea
                                    placeholder="Briefly describe your expertise, stack, and professional goals..."
                                    value={inputData.bio}
                                    onChange={(e) => setInputData({ ...inputData, bio: e.target.value })}
                                    className="min-h-[160px] bg-slate-50/50 border-slate-200/60 focus-visible:ring-indigo-500 text-slate-700 text-sm p-4 rounded-xl resize-none shadow-inner"
                                />
                                <p className="text-[10px] text-slate-400 font-medium px-1 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-indigo-400" />
                                    Tip: Mentioning specific skills helps our Gemini AI engine generate your tailored resume.
                                </p>
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

                        {/* Builder & Opportunity Metadata */}
                        <div className="glass-card p-8 border border-white/60 shadow-xl space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Synergy & Opportunities</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Builder Status & Professional Radar</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                        Target Role / Specialization
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Senior Full-Stack Engineer"
                                        value={inputData.targetRole}
                                        onChange={(e) => setInputData({ ...inputData, targetRole: e.target.value })}
                                        className="w-full bg-slate-50/50 border border-slate-200/60 focus:ring-2 focus:ring-indigo-500 h-11 px-4 text-xs font-medium text-slate-800 rounded-xl shadow-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                        Contract / Hourly Rate
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="e.g. $85/hr or $6,000/mo"
                                            value={inputData.hourlyRate}
                                            onChange={(e) => setInputData({ ...inputData, hourlyRate: e.target.value })}
                                            className="w-full bg-slate-50/50 border border-slate-200/60 focus:ring-2 focus:ring-indigo-500 h-11 pl-9 pr-4 text-xs font-medium text-slate-800 rounded-xl shadow-sm outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
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

                        {/* Action Bar */}
                        <div className="flex items-center justify-end pt-4">
                            <Button 
                                onClick={() => navigate(-1)}
                                variant="ghost"
                                className="mr-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-slate-900"
                            >
                                Discard Changes
                            </Button>
                            
                            <Button 
                                onClick={editProfileHandler} 
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-2xl transition-all shadow-xl shadow-indigo-200 group active:scale-95 disabled:opacity-70"
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
