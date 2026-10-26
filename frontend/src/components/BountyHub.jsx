import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  DollarSign, Briefcase, Sparkles, Tag, ArrowRight, 
  ExternalLink, MessageSquare, Filter, Search, CheckCircle2, 
  Code, ShieldCheck, PlusCircle 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CreatePost from "./CreatePost";

const BountyHub = () => {
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all"); // 'all', 'service_offered', 'task_bounty'
  const [searchQuery, setSearchQuery] = useState("");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const navigate = useNavigate();

  const fetchBounties = async () => {
    try {
      setLoading(true);
      const url = filterType === "all" 
        ? `${import.meta.env.VITE_API_URL}/post/bounties/all`
        : `${import.meta.env.VITE_API_URL}/post/bounties/all?type=${filterType}`;
      
      const res = await axios.get(url, { withCredentials: true });
      if (res.data.success) {
        setBounties(res.data.bounties || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bounties hub");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBounties();
  }, [filterType]);

  const filteredBounties = bounties.filter((bounty) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const captionMatch = bounty.caption?.toLowerCase().includes(query);
    const authorMatch = bounty.author?.username?.toLowerCase().includes(query);
    const tagsMatch = bounty.tags?.some((t) => t.toLowerCase().includes(query));
    return captionMatch || authorMatch || tagsMatch;
  });

  const handleCommission = (bounty) => {
    const creatorName = bounty.author?.username || "creator";
    const amount = bounty.bountyAmount ? ` for ${bounty.bountyAmount}` : "";
    const typeLabel = bounty.bountyType === "task_bounty" ? "open bounty task" : "deliverable service";
    
    // Store prepopulated draft in localStorage for chat
    localStorage.setItem(
      "zocial_chat_draft", 
      `Hi @${creatorName}, I am contacting you regarding your ${typeLabel}${amount}: "${bounty.caption?.substring(0, 60)}...". Let's collaborate!`
    );
    navigate("/chat");
    toast.success(`Opening chat with @${creatorName}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pt-20 pb-16 px-4 md:px-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Hero Header */}
        <div className="relative rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-8 md:p-12 overflow-hidden shadow-2xl border border-indigo-500/20">
          <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute right-12 top-8 hidden lg:block opacity-20">
            <DollarSign className="w-64 h-64 text-indigo-400" />
          </div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> Peer-to-Peer Micro-Gig Marketplace
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Bounties & Verified Deliverables
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed font-medium">
              Commission production-ready components, APIs, and micro-features directly from verified builders with proof-of-work verification and zero middleman fees.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setCreatePostOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider px-6 py-5 rounded-2xl shadow-xl shadow-indigo-500/25 gap-2"
              >
                <PlusCircle className="h-4 w-4" /> Post a Bounty / Gig
              </Button>
              <div className="text-xs text-emerald-400 flex items-center gap-1.5 pl-2 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> 100% Free • 0% Platform Fees • Open Collaboration
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-white/60 shadow-lg">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setFilterType("all")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filterType === "all"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Deliverables
            </button>
            <button
              onClick={() => setFilterType("service_offered")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filterType === "service_offered"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Services Offered
            </button>
            <button
              onClick={() => setFilterType("task_bounty")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filterType === "task_bounty"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Open Bounties
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tech, creator, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 outline-none transition-all"
            />
          </div>
        </div>

        {/* Grid of Bounties */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold uppercase tracking-widest">Querying live bounties...</p>
          </div>
        ) : filteredBounties.length === 0 ? (
          <div className="py-20 text-center glass-card p-12 rounded-3xl border border-dashed border-slate-300 space-y-4">
            <Briefcase className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-black text-slate-700">No Bounties Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first builder to list a freelance deliverable or create an open challenge with cash compensation.
            </p>
            <Button
              onClick={() => setCreatePostOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-6"
            >
              Create First Bounty
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBounties.map((bounty) => (
              <div
                key={bounty._id}
                className="glass-card rounded-3xl overflow-hidden border border-white/80 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                {/* Visual Artifact Cover */}
                <div className="relative h-48 bg-slate-900 overflow-hidden">
                  <img
                    src={bounty.image}
                    alt={bounty.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                  {/* Header Badge */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md backdrop-blur-md ${
                      bounty.bountyType === "task_bounty"
                        ? "bg-purple-600/90 text-white"
                        : "bg-emerald-600/90 text-white"
                    }`}>
                      {bounty.bountyType === "task_bounty" ? "Open Bounty" : "Service Deliverable"}
                    </span>

                    {bounty.bountyAmount && (
                      <span className="text-xs font-black bg-white/95 text-slate-900 px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-emerald-600" />
                        {bounty.bountyAmount}
                      </span>
                    )}
                  </div>

                  {/* Creator Info on Image */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <Avatar className="h-8 w-8 border-2 border-white shadow-md">
                      <AvatarImage src={bounty.author?.profilepicture} />
                      <AvatarFallback className="bg-slate-700 text-white text-[10px] font-bold">
                        {bounty.author?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white shadow-sm">@{bounty.author?.username}</p>
                      <p className="text-[10px] text-slate-300">{bounty.author?.targetRole || "Software Builder"}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <p className="text-xs text-slate-700 font-medium line-clamp-3 leading-relaxed">
                      {bounty.caption}
                    </p>

                    {/* Tech Stack Tags */}
                    {bounty.tags && bounty.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {bounty.tags.slice(0, 4).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer & CTA */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {bounty.author?.openToOpportunities ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          Available Now
                        </span>
                      ) : (
                        "Verified Creator"
                      )}
                    </div>

                    <Button
                      onClick={() => handleCommission(bounty)}
                      className={`text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-md ${
                        bounty.bountyType === "task_bounty"
                          ? "bg-purple-600 hover:bg-purple-700 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {bounty.bountyType === "task_bounty" ? "Claim Bounty" : "Commission"}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreatePost open={createPostOpen} setOpen={setCreatePostOpen} />
    </div>
  );
};

export default BountyHub;
