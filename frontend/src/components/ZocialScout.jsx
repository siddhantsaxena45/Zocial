import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Search, Filter, Sparkles, Briefcase, DollarSign, Github, 
  Globe, ShieldCheck, ArrowRight, ExternalLink, MessageSquare, 
  CheckCircle2, Users, FileText, Code 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setSelectedUser } from "@/redux/authSlice";
import { toast } from "sonner";
import JobFitModal from "./JobFitModal";

const ZocialScout = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [skillsQuery, setSkillsQuery] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedCandidateForFit, setSelectedCandidateForFit] = useState(null);
  const [jobFitOpen, setJobFitOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const searchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (semanticQuery.trim()) params.append("query", semanticQuery.trim());
      if (skillsQuery.trim()) params.append("skills", skillsQuery.trim());
      if (roleQuery.trim()) params.append("role", roleQuery.trim());
      if (openOnly) params.append("openOnly", "true");

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/scout?${params.toString()}`, {
        withCredentials: true
      });

      if (res.data.success) {
        setCandidates(res.data.candidates || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to query candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchCandidates();
  }, [openOnly]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      searchCandidates();
    }
  };

  const clearFilters = () => {
    setSemanticQuery("");
    setSkillsQuery("");
    setRoleQuery("");
    setOpenOnly(false);
    setTimeout(() => {
      searchCandidates();
    }, 50);
  };

  const startChatWithCandidate = (candidate) => {
    localStorage.setItem("zocial_chat_target", JSON.stringify(candidate));
    dispatch(setSelectedUser(candidate));
    localStorage.setItem(
      "zocial_chat_draft", 
      `Hi @${candidate.username}, I reviewed your proof-of-work on Zocial Scout. We're looking for a ${candidate.targetRole || "developer"} and would love to connect!`
    );
    navigate("/chat");
    toast.success(`Opening chat with @${candidate.username}`);
  };

  const isFilterActive = Boolean(semanticQuery.trim() || skillsQuery.trim() || roleQuery.trim());

  return (
    <div className="w-full py-4 md:py-8 bg-transparent">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Recruiter Portal Hero */}
        <div className="relative rounded-3xl bg-gradient-to-br from-purple-950 via-slate-950 to-indigo-950 text-white p-8 md:p-12 overflow-hidden shadow-2xl border border-purple-500/20">
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Zocial Scout • AI Semantic Talent Engine
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Source Verified Builders with Proof-of-Work
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed font-medium">
              Powered by AI semantic evaluation. Search candidates using natural language, technical scope, or verified Git transmissions and visual architecture artifacts.
            </p>
          </div>
        </div>

        {/* Filter & Sourcing Control Center */}
        <div className="glass-card p-6 rounded-3xl border border-white/60 shadow-xl space-y-4">
          {/* Main AI Semantic Search Bar */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" /> AI Semantic Search (Natural Language or Technical Scope)
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-purple-500" />
              <input
                type="text"
                placeholder="e.g. Senior engineer who built cloud microservices with React & Kafka, or Creative UI/UX designer with modern Tailwind proofs..."
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full bg-white border border-purple-200/80 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 shadow-sm transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">
                Technologies / Stack
              </label>
              <div className="relative">
                <Code className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. React, Node.js, Python..."
                  value={skillsQuery}
                  onChange={(e) => setSkillsQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">
                Role / Specialization
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Full-Stack Lead, Backend Architect..."
                  value={roleQuery}
                  onChange={(e) => setRoleQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={searchCandidates}
                className="flex-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider py-5 rounded-xl shadow-lg shadow-purple-500/20 gap-2 active:scale-95 transition-all"
              >
                <Sparkles className="h-4 w-4 text-amber-300" /> Scout Semantic
              </Button>
              {isFilterActive && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold py-5 rounded-xl px-3"
                  title="Clear all filters"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(e) => setOpenOnly(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Open to Opportunities / Gigs Only
                </span>
              </label>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Found <span className="text-indigo-600 font-black">{candidates.length}</span> {isFilterActive ? "Matching Candidates" : "Verified Builders"}
            </div>
          </div>
        </div>

        {/* Candidate Results */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold uppercase tracking-widest">Running AI Semantic Talent Match...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-20 text-center glass-card p-12 rounded-3xl border border-dashed border-slate-300 space-y-4">
            <Users className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-black text-slate-700">No Candidates Matching Criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try broadening your semantic search description or clearing filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {candidates.map((candidate) => (
              <div
                key={candidate._id}
                className="glass-card rounded-3xl p-6 border border-white/80 shadow-xl hover:shadow-2xl transition-all duration-300 space-y-5 flex flex-col justify-between"
              >
                {/* Header Profile Area */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Link to={`/profile/${candidate._id}`}>
                        <Avatar className="h-14 w-14 border-2 border-indigo-100 shadow-md hover:scale-105 transition-transform">
                          <AvatarImage src={candidate.profilepicture} />
                          <AvatarFallback className="bg-indigo-600 text-white font-bold text-base">
                            {candidate.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link to={`/profile/${candidate._id}`}>
                            <h3 className="text-base font-black text-slate-900 hover:text-indigo-600 transition-colors">
                              @{candidate.username}
                            </h3>
                          </Link>
                          {candidate.openToOpportunities && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-bold text-[9px] uppercase tracking-wider">
                              Open to Gigs
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-indigo-700">
                          {candidate.targetRole}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Rate: <span className="font-semibold text-slate-700">{candidate.hourlyRate}</span>
                        </p>
                      </div>
                    </div>

                    {/* Match Score Badge (ONLY when searching) or Verified Builder (when browsing) */}
                    <div className="flex flex-col items-end">
                      {candidate.matchScore !== null && candidate.matchScore !== undefined ? (
                        <div className="px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 font-black text-xs flex items-center gap-1 shadow-sm">
                          <Sparkles className="h-3 w-3 text-indigo-600" />
                          <span>{candidate.matchScore}% Match</span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 bg-purple-50/90 border border-purple-200/80 rounded-xl text-purple-700 font-bold text-[10px] flex items-center gap-1 shadow-sm">
                          <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                          <span>Verified Builder</span>
                        </div>
                      )}
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        {candidate.proofOfWorkCount} Transmissions
                      </span>
                    </div>
                  </div>

                  {/* Semantic Match Reason if generated */}
                  {candidate.semanticReason && (
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-purple-800 bg-purple-50/80 px-3 py-1.5 rounded-xl border border-purple-100 shadow-xs">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span className="line-clamp-1">{candidate.semanticReason}</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 font-medium line-clamp-2 italic leading-relaxed">
                    "{candidate.bio || "Dedicated builder creating production-ready digital solutions."}"
                  </p>

                  {/* Skills Pills */}
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.slice(0, 6).map((skill, idx) => (
                        <span
                          key={idx}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            candidate.matchedSkills?.some(m => m.toLowerCase() === skill.toLowerCase())
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Verified Proof-of-Work Gallery Thumbnails */}
                  {candidate.transmissions && candidate.transmissions.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Verified Proof-of-Work Artifacts
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {candidate.transmissions.slice(0, 3).map((item) => (
                          <div
                            key={item._id}
                            className="relative h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 group/item shadow-sm"
                          >
                            <img
                              src={item.image}
                              alt="artifact"
                              className="w-full h-full object-cover group-hover/item:scale-110 transition-transform"
                            />
                            {item.githubUrl && (
                              <span className="absolute bottom-1 right-1 p-1 bg-black/70 rounded-md text-white">
                                <Github className="h-2.5 w-2.5" />
                              </span>
                            )}
                            {item.liveUrl && (
                              <span className="absolute top-1 right-1 p-1 bg-indigo-600/90 rounded-md text-white">
                                <ExternalLink className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action CTAs */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {candidate.githubProfile && (
                      <a
                        href={candidate.githubProfile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="GitHub Profile"
                      >
                        <Github className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {candidate.portfolioUrl && (
                      <a
                        href={candidate.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Portfolio Website"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Link to={`/resume/${candidate._id}`}>
                      <Button
                        variant="outline"
                        className="text-[10px] font-black uppercase tracking-wider h-8 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1"
                      >
                        <FileText className="h-3 w-3" /> View Resume
                      </Button>
                    </Link>
                  </div>

                  <Button
                    onClick={() => startChatWithCandidate(candidate)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider h-8 rounded-xl px-4 shadow-md shadow-indigo-100 gap-1.5"
                  >
                    <MessageSquare className="h-3 w-3" /> Direct InMail
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ZocialScout;
