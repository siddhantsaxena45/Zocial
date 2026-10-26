import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import useGetUserProfile from '@/hooks/useGetUserProfile';
import { setUserProfile } from '@/redux/authSlice';
import { Button } from './ui/button';
import { 
    ArrowLeft, Download, Mail, Briefcase, Award, Zap, 
    LayoutDashboard, Sparkles, Loader2, RefreshCw, Layers, Target, Github, Globe 
} from 'lucide-react';
import useAxiosInterceptor from '@/hooks/useAxiosInterceptor';
import axios from 'axios';
import { toast } from 'sonner';
import JobFitModal from './JobFitModal';

const ResumeGenerator = () => {
    useAxiosInterceptor();
    const params = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    useGetUserProfile(params.id);
    const { userProfile, user: authUser } = useSelector(state => state.auth);

    const [isGenerating, setIsGenerating] = useState(false);
    const [resumeData, setResumeData] = useState(null);
    const [jobFitOpen, setJobFitOpen] = useState(false);

    // Sync resumeData when userProfile changes
    useEffect(() => {
        if (userProfile?.resume_data) {
            setResumeData(userProfile.resume_data);
        }
    }, [userProfile]);

    const isOwner = authUser?._id === params.id || !params.id || authUser?._id === userProfile?._id;

    // Handle Generation / Regeneration using Gemini AI
    const handleGenerateResume = async () => {
        setIsGenerating(true);
        try {
            const targetId = params.id || authUser?._id;
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/resume/generate/${targetId}`,
                {},
                { withCredentials: true }
            );

            if (res.data.success) {
                toast.success(res.data.message || "Resume updated with Gemini AI!");
                setResumeData(res.data.resume);
                if (res.data.user) {
                    dispatch(setUserProfile(res.data.user));
                }
            } else {
                toast.error(res.data.message || "Failed to generate resume");
            }
        } catch (error) {
            console.error("Resume Generation Error:", error);
            const msg = error.response?.data?.message || "Failed to generate AI resume";
            toast.error(msg);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!userProfile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold text-slate-500">Loading Professional Profile...</p>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    const activeSkills = resumeData?.skills || userProfile.skills || [];
    const activeSummary = resumeData?.ai_summary || userProfile.ai_summary || "";
    const activeHeadline = resumeData?.headline || userProfile.bio || "Zocial Network Professional";
    const activeHighlights = resumeData?.highlights || [];
    const activeDomains = resumeData?.domains || [];
    const engineModel = resumeData?.model || "gemini-2.5-flash";

    return (
        <div className="min-h-screen bg-slate-100 py-10 print:bg-white print:py-0">
            {/* Top Bar - Hidden in Print */}
            <div className="max-w-4xl mx-auto mb-6 flex flex-wrap justify-between items-center gap-4 px-4 print:hidden">
                <Button 
                    variant="outline" 
                    onClick={() => navigate(-1)} 
                    className="gap-2 rounded-xl border-white shadow-sm hover:bg-white bg-white/70 backdrop-blur-md text-xs font-bold text-slate-700"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Network
                </Button>

                <div className="flex items-center gap-3">
                    {/* AI Job-Fit Scanner Button */}
                    <Button 
                        variant="outline"
                        onClick={() => setJobFitOpen(true)} 
                        className="gap-2 bg-white/90 hover:bg-white text-indigo-700 border-indigo-200 text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                        <Target className="h-4 w-4 text-indigo-600" />
                        <span>AI Job-Fit Scanner</span>
                    </Button>

                    {/* Gemini AI Action Button */}
                    <Button 
                        onClick={handleGenerateResume} 
                        disabled={isGenerating}
                        className="gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-md transition-all text-xs font-bold"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Generating with Gemini...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 text-amber-300" />
                                <span>{resumeData ? "Regenerate with Gemini AI" : "Generate AI Resume"}</span>
                            </>
                        )}
                    </Button>

                    {/* PDF Export Button */}
                    <Button 
                        onClick={handlePrint} 
                        className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition-all text-xs font-bold"
                    >
                        <Download className="h-4 w-4" /> Export PDF
                    </Button>
                </div>
            </div>

            {/* A4 Paper Canvas */}
            <div className="max-w-4xl mx-auto bg-white shadow-2xl print:shadow-none min-h-[1056px] p-8 sm:p-16 relative overflow-hidden rounded-2xl print:rounded-none">
                
                {/* Background Decor */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 border-b-2 border-slate-100 pb-8 mb-8 relative z-10">
                    <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl overflow-hidden shrink-0 shadow-lg border-4 border-white">
                        <img 
                            src={userProfile.profilepicture || "https://github.com/shadcn.png"} 
                            alt={userProfile.username}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">
                                {userProfile.username}
                            </h1>
                            {resumeData && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    <Sparkles className="h-3 w-3 text-indigo-500" />
                                    AI Verified ({engineModel})
                                </span>
                            )}
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-indigo-600 tracking-wide uppercase mb-3">
                            {activeHeadline}
                        </h2>
                        <div className="flex flex-wrap items-center gap-5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                            <span className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-slate-400"/> 
                                {userProfile.email || "Contact via Zocial"}
                            </span>
                            <span className="flex items-center gap-2">
                                <Briefcase className="h-3.5 w-3.5 text-slate-400"/> 
                                {userProfile.posts?.length || 0} Transmissions
                            </span>
                            {userProfile.githubProfile && (
                                <a 
                                    href={userProfile.githubProfile}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800"
                                >
                                    <Github className="h-3.5 w-3.5 text-slate-500"/> GitHub
                                </a>
                            )}
                            {userProfile.portfolioUrl && (
                                <a 
                                    href={userProfile.portfolioUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800"
                                >
                                    <Globe className="h-3.5 w-3.5 text-slate-500"/> Portfolio
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Split */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 relative z-10">
                    
                    {/* Left Column (Skills & Domain & Network) */}
                    <div className="md:col-span-4 flex flex-col gap-8">
                        {/* Domain Specializations */}
                        {activeDomains.length > 0 && (
                            <div>
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-indigo-500" /> Domain Focus
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {activeDomains.map((dom, idx) => (
                                        <span key={idx} className="text-[11px] font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-100 px-2.5 py-1 rounded-lg">
                                            {dom}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Extracted Skills */}
                        <div>
                            <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Zap className="h-4 w-4" /> Technical Competencies
                            </h3>
                            <div className="flex flex-col gap-3.5">
                                {activeSkills.length > 0 ? (
                                    activeSkills.map((skill, index) => (
                                        <div key={index} className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center w-full">
                                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{skill}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-indigo-600 rounded-full" 
                                                    style={{ width: `${Math.max(45, 100 - (index * 8))}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium">
                                        No skills synthesized yet. Click <strong>Generate AI Resume</strong> to analyze posts with Gemini.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Influence & Network Reach */}
                        <div>
                            <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <Award className="h-4 w-4" /> Network Endorsements
                            </h3>
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Followers & Reach</span>
                                    <span className="text-2xl font-black text-slate-900">{userProfile.followers?.length || 0}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Synergy Connections</span>
                                    <span className="text-2xl font-black text-slate-900">{userProfile.following?.length || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Executive Summary & Experience Highlights) */}
                    <div className="md:col-span-8 flex flex-col gap-8 md:border-l-2 md:border-slate-100 md:pl-10 relative">
                        {/* Executive AI Career Summary */}
                        {activeSummary && (
                            <div>
                                <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                                    <Sparkles className="h-4 w-4" /> Executive Career Summary
                                </h3>
                                <div className="bg-indigo-50/40 rounded-2xl p-5 border border-indigo-100/60 relative overflow-hidden">
                                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                        {activeSummary}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Gemini Synthesized Highlights */}
                        {activeHighlights.length > 0 && (
                            <div>
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                    <Sparkles className="h-4 w-4 text-indigo-500" /> Key Project & Engineering Highlights
                                </h3>
                                <div className="flex flex-col gap-4">
                                    {activeHighlights.map((hl, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">{hl.title}</h4>
                                            </div>
                                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                                {hl.detail}
                                            </p>
                                            {hl.skills && hl.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {hl.skills.map((s, si) => (
                                                        <span key={si} className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Professional Transmissions Portfolio */}
                        <div>
                            <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                <LayoutDashboard className="h-4 w-4" /> Technical Transmissions Portfolio
                            </h3>
                            
                            <div className="flex flex-col gap-6">
                                {userProfile.posts && userProfile.posts.slice(0, 3).map((post, i) => (
                                    <div key={post._id} className="relative pb-4 border-b border-slate-100 last:border-b-0">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                                            {new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                        
                                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                                            {post.image && (
                                                <div className="h-20 w-20 rounded-xl overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                                                    <img src={post.image} className="w-full h-full object-cover grayscale opacity-90" alt="Portfolio Data" />
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-700 font-medium leading-relaxed italic border-l-2 border-indigo-200 pl-3 py-1">
                                                "{post.caption}"
                                            </p>
                                        </div>
                                        
                                        <div className="flex gap-4 mt-2">
                                            <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400">
                                                {post.likes?.length || 0} Peer Endorsements
                                            </span>
                                            <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400">
                                                {post.comments?.length || 0} Discussion Replies
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                
                                {(!userProfile.posts || userProfile.posts.length === 0) && (
                                    <span className="text-xs text-slate-400 font-medium">
                                        No professional transmissions logged yet. Post project updates to build your portfolio.
                                    </span>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            
            <style jsx="true" global="true">{`
                @media print {
                    @page { size: auto; margin: 0mm; }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: white !important;
                    }
                }
            `}</style>

            {/* AI Job-Fit Scanner Modal */}
            <JobFitModal open={jobFitOpen} setOpen={setJobFitOpen} />
        </div>
    );
};

export default ResumeGenerator;
