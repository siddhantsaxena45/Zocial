import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Search, Filter, Sparkles, Briefcase, Github, 
  Globe, ShieldCheck, ExternalLink, MessageSquare, 
  Users, FileText, Code, Target, RefreshCw, X, CheckCircle2 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser } from "@/redux/authSlice";
import { toast } from "sonner";

const SAMPLE_JDS = [
  {
    title: "Full-Stack React & Node",
    jd: "Seeking a Senior Full-Stack Engineer with proven production experience in React, Node.js, Express, and PostgreSQL/MongoDB. Responsibilities include building scalable web applications, responsive user interfaces, RESTful microservices, and modern authentication."
  },
  {
    title: "Python & Cloud Architect",
    jd: "Looking for a Backend/Cloud Engineer proficient in Python, FastAPI/Django, Docker, and AWS microservices. Key focus on API performance, distributed systems, caching with Redis, and automated CI/CD pipeline deployments."
  },
  {
    title: "AI & Full-Stack Builder",
    jd: "Hiring an AI Application Engineer skilled in Python, LangChain, OpenAI/Gemini APIs, Next.js, and Tailwind CSS. Experience in LLM semantic retrieval, vector search, and interactive AI user experiences is strongly preferred."
  }
];

const ZocialScout = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState("jd"); // "jd" | "scope"
  const [jobDescription, setJobDescription] = useState("");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [skillsQuery, setSkillsQuery] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [isJDModeActive, setIsJDModeActive] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: authUser } = useSelector((state) => state.auth);

  const searchCandidates = async (overrideParams = {}) => {
    try {
      setLoading(true);
      const activeMode = overrideParams.mode || searchMode;
      const jdToUse = overrideParams.jd !== undefined ? overrideParams.jd : jobDescription;
      const isJD = activeMode === "jd" && Boolean(jdToUse?.trim());

      const payload = {
        jd: isJD ? jdToUse.trim() : "",
        query: activeMode === "scope" ? (overrideParams.query !== undefined ? overrideParams.query : semanticQuery).trim() : "",
        skills: (overrideParams.skills !== undefined ? overrideParams.skills : skillsQuery).trim(),
        role: (overrideParams.role !== undefined ? overrideParams.role : roleQuery).trim(),
        openOnly: (overrideParams.openOnly !== undefined ? overrideParams.openOnly : openOnly) ? "true" : "false"
      };

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/user/scout`, payload, {
        withCredentials: true
      });

      if (res.data.success) {
        setCandidates(res.data.candidates || []);
        setIsJDModeActive(Boolean(res.data.isJDMatch));
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

  const handleApplySampleJD = (sampleJdText) => {
    setJobDescription(sampleJdText);
    setSearchMode("jd");
    searchCandidates({ mode: "jd", jd: sampleJdText });
    toast.success("Sample Job Description loaded & ATS scan started!");
  };

  const clearFilters = () => {
    setJobDescription("");
    setSemanticQuery("");
    setSkillsQuery("");
    setRoleQuery("");
    setOpenOnly(false);
    setIsJDModeActive(false);
    searchCandidates({ mode: "jd", jd: "", query: "", skills: "", role: "", openOnly: false });
  };

  const startChatWithCandidate = (candidate) => {
    localStorage.setItem("zocial_chat_target", JSON.stringify(candidate));
    dispatch(setSelectedUser(candidate));
    
    const draft = candidate.matchScore
      ? `Hi @${candidate.username}, I reviewed your proof-of-work on Zocial Scout. Your profile matched ${candidate.matchScore}% with our target requirements and we'd love to connect!`
      : `Hi @${candidate.username}, I reviewed your verified transmissions on Zocial Scout and would love to collaborate!`;

    localStorage.setItem("zocial_chat_draft", draft);
    navigate("/chat");
    toast.success(`Opening direct collaboration with @${candidate.username}`);
  };

  const isFilterActive = Boolean(
    jobDescription.trim() || 
    semanticQuery.trim() || 
    skillsQuery.trim() || 
    roleQuery.trim()
  );

  const visibleCandidates = candidates.filter(
    (c) => String(c._id) !== String(authUser?._id)
  );

  return (
    <div className="w-full py-4 md:py-8 bg-transparent">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Recruiter Portal Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-purple-950 via-slate-950 to-indigo-950 text-white p-8 md:p-12 overflow-hidden shadow-2xl border border-purple-500/20">
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider backdrop-blur-md">
              <Target className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              Zocial Scout • AI Job-Fit ATS Recruiter Suite
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Paste JD & Rank Builders by <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-300 bg-clip-text text-transparent">Top ATS Score</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed font-medium">
              Powered by Gemini AI semantic ATS evaluation. Paste any Job Description to automatically score and rank candidates so the top ATS matches appear first.
            </p>
          </div>
        </div>

        {/* Sourcing & Job-Fit Console */}
        <div className="glass-card rounded-3xl p-5 sm:p-7 border border-white/80 shadow-xl shadow-indigo-950/5 space-y-6">
          
          {/* Mode Selector Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSearchMode("jd")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  searchMode === "jd"
                    ? "bg-white text-indigo-700 shadow-sm shadow-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Target className="h-4 w-4 text-indigo-600" />
                <span>AI Job-Fit Matcher (Paste JD)</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("scope")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  searchMode === "scope"
                    ? "bg-white text-indigo-700 shadow-sm shadow-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Search className="h-4 w-4 text-indigo-600" />
                <span>Quick Scope & Stack Filter</span>
              </button>
            </div>

            {isFilterActive && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Clear Filters
              </button>
            )}
          </div>

          {/* TAB 1: AI Job-Fit Scanner (Paste JD) */}
          {searchMode === "jd" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-purple-600" />
                  Paste Target Job Description (JD) or Role Specifications
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400">Quick Samples:</span>
                  {SAMPLE_JDS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplySampleJD(sample.jd)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      {sample.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste complete Job Description (JD) or technical requirements here... e.g. We are looking for a Full-Stack Engineer with React, Node.js, PostgreSQL, Docker, and experience with cloud microservices..."
                  rows={4}
                  className="w-full bg-white border border-purple-200/90 rounded-2xl p-4 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-400 shadow-sm leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-[11px] text-slate-400 font-medium">
                  {jobDescription.trim().length > 0 ? (
                    <span>{jobDescription.trim().length} characters • Ready for Gemini ATS evaluation</span>
                  ) : (
                    <span>Paste any JD above to rank builders by ATS match percentage</span>
                  )}
                </div>
                <Button
                  onClick={() => searchCandidates({ mode: "jd" })}
                  disabled={!jobDescription.trim()}
                  className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-purple-600/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Scan JD & Rank Candidates by ATS Score</span>
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: Quick Scope & Keyword Filter */}
          {searchMode === "scope" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  Natural Language Query or Architectural Scope
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
                  <input
                    type="text"
                    value={semanticQuery}
                    onChange={(e) => setSemanticQuery(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="e.g. Senior engineer who built cloud microservices with React & Kafka..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none text-xs sm:text-sm font-medium text-slate-800 transition-all placeholder:text-slate-400 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Technologies / Stack
                  </label>
                  <div className="relative">
                    <Code className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={skillsQuery}
                      onChange={(e) => setSkillsQuery(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="e.g. React, Node.js, Python..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 outline-none text-xs text-slate-700 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Role / Specialization
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={roleQuery}
                      onChange={(e) => setRoleQuery(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="e.g. Full-Stack Lead, Backend Architect..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 outline-none text-xs text-slate-700 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={() => searchCandidates({ mode: "scope" })}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Apply Match
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sourcing Availability Toggle & Count */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <label className="relative flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(e) => setOpenOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-2 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Open to Opportunities / Gigs Only
                </span>
              </label>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Found <span className="text-indigo-600 font-black">{visibleCandidates.length}</span> {isFilterActive ? "Matching Candidates" : "Verified Builders"}
            </div>
          </div>
        </div>

        {/* ATS Evaluation Active Banner */}
        {isFilterActive && visibleCandidates.some(c => c.matchScore !== null) && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200/80 flex items-center justify-between flex-wrap gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                  Top ATS Score Ranking Active
                </p>
                <p className="text-[11px] text-indigo-800 font-medium">
                  Candidates are evaluated against your job requirements and ordered with the highest ATS fit first.
                </p>
              </div>
            </div>
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline"
            >
              Reset to Default Pool
            </button>
          </div>
        )}

        {/* Candidate Results */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Running Gemini ATS Evaluation...</p>
          </div>
        ) : visibleCandidates.length === 0 ? (
          <div className="py-20 text-center glass-card p-12 rounded-3xl border border-dashed border-slate-300 space-y-4">
            <Users className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-black text-slate-700">No Candidates Matching Criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your Job Description or clearing filters to browse verified builders.
            </p>
            <Button
              onClick={clearFilters}
              variant="outline"
              className="rounded-xl border-slate-200 text-xs font-bold"
            >
              View All Builders
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibleCandidates.map((candidate) => (
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

                    {/* ATS Score Badge (When searching) vs Verified Builder Badge */}
                    <div className="flex flex-col items-end">
                      {candidate.matchScore !== null && candidate.matchScore !== undefined ? (
                        <div className={`px-3 py-1 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-sm border ${
                          candidate.matchScore >= 80
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : candidate.matchScore >= 60
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          <Sparkles className="h-3 w-3" />
                          <span>{candidate.matchScore}% ATS Score</span>
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

                  {/* Semantic ATS Match Reason */}
                  {candidate.semanticReason && (
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-purple-900 bg-purple-50/90 px-3.5 py-2 rounded-xl border border-purple-100 shadow-xs">
                      <Target className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span className="leading-relaxed">{candidate.semanticReason}</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 font-medium line-clamp-2 italic leading-relaxed">
                    "{candidate.bio || "Dedicated builder creating production-ready digital solutions."}"
                  </p>

                  {/* Skills Pills */}
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.slice(0, 6).map((skill, idx) => {
                        const isMatched = candidate.matchedSkills?.some(
                          m => m.toLowerCase() === skill.toLowerCase()
                        );
                        return (
                          <span
                            key={idx}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                              isMatched
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {isMatched && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-300" />}
                            {skill}
                          </span>
                        );
                      })}
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
