import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { 
  Sparkles, Loader2, CheckCircle2, AlertTriangle, 
  HelpCircle, Copy, Check, Target, Lightbulb, Eye, X 
} from "lucide-react";
import axios from 'axios';
import { toast } from 'sonner';

const JobFitModal = ({ open, setOpen }) => {
  const [jobDescription, setJobDescription] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [copiedPitch, setCopiedPitch] = useState(false);

  const handleSimulate = async () => {
    if (!jobDescription.trim()) {
      return toast.error("Please paste the job description or role requirements.");
    }

    setIsScanning(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/resume/job-fit`,
        { jobDescription },
        { withCredentials: true }
      );

      if (res.data.success && res.data.analysis) {
        setAnalysis(res.data.analysis);
        toast.success(`Job-Fit simulation complete via ${res.data.model || 'Gemini'}!`);
      } else {
        toast.error(res.data.message || "Failed to analyze job fit.");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Simulation failed. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopyPitch = () => {
    if (analysis?.tailoredPitch) {
      navigator.clipboard.writeText(analysis.tailoredPitch);
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
      toast.success("Tailored pitch copied to clipboard!");
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-700 bg-emerald-50/80 border-emerald-200";
    if (score >= 60) return "text-amber-700 bg-amber-50/80 border-amber-200";
    return "text-slate-700 bg-slate-50/80 border-slate-200";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl w-full bg-white text-slate-900 border border-purple-100 shadow-2xl rounded-3xl p-6 sm:p-7 z-50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-purple-100/70 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-100 text-purple-700 flex items-center justify-center shrink-0 shadow-xs border border-purple-200/50">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  AI Job-Fit Simulator
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-full">
                  Gemini 2.5 Flash
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                  100% Free
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Audit real proof-of-work transmissions against any target job description
              </p>
            </div>
          </div>
          <button 
            onClick={() => setOpen(false)}
            className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input Area */}
        <div className="space-y-3 pt-4">
          <div className="relative">
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste target job description or role requirements here (e.g. 'Senior Full-Stack Engineer at Stripe... Requirements: React, Node.js, Distributed Systems, Microservices...')"
              className="text-xs text-slate-800 bg-slate-50/70 border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 rounded-2xl resize-none min-h-[125px] p-4 transition-all placeholder:text-slate-400 font-medium leading-relaxed"
              rows={4}
            />
            {jobDescription && (
              <button
                onClick={() => setJobDescription("")}
                className="absolute top-3 right-3 text-[10px] font-bold text-slate-400 hover:text-slate-700 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200 shadow-xs transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <Button
            onClick={handleSimulate}
            disabled={isScanning || !jobDescription.trim()}
            className="w-full rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider py-3 shadow-lg shadow-purple-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Auditing Transmissions & ATS Match...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Run Job-Fit Simulation</span>
              </>
            )}
          </Button>
        </div>

        {/* Simulation Results */}
        {analysis && (
          <div className="mt-4 pt-4 border-t border-purple-100/70 space-y-4">
            {/* Score & Tier Banner */}
            <div className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between ${getScoreColor(analysis.matchScore)}`}>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Calculated ATS Match</span>
                <span className="text-base font-black uppercase tracking-wide">{analysis.matchTier || "Analysis Complete"}</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black">
                {analysis.matchScore}%
              </div>
            </div>

            {/* Matched vs Missing Skills Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Matched */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Proven on Zocial
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.matchedSkills?.length > 0 ? (
                    analysis.matchedSkills.map((skill, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-white text-emerald-800 text-[11px] font-bold border border-emerald-200/80 shadow-xs">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs">None detected</span>
                  )}
                </div>
              </div>

              {/* Missing Gaps */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 space-y-2">
                <span className="font-bold text-amber-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> Missing Proof-of-Work
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.missingSkills?.length > 0 ? (
                    analysis.missingSkills.map((skill, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-white text-amber-800 text-[11px] font-bold border border-amber-200/80 shadow-xs">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs">None</span>
                  )}
                </div>
              </div>
            </div>

            {/* Visually Verified Evidence */}
            {analysis.visualEvidence?.length > 0 && (
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2.5">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <Eye className="h-4 w-4 text-emerald-600" /> Visually Verified From Transmissions ({analysis.visualArtifactsAnalyzed || 1} Proofs)
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 font-medium pl-4 list-disc">
                  {analysis.visualEvidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actionable Project Suggestions */}
            {analysis.actionableRecommendations?.length > 0 && (
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/80 space-y-2.5">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <Lightbulb className="h-4 w-4 text-indigo-600" /> Actionable Proof-of-Work Recommendations
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 font-medium pl-4 list-disc">
                  {analysis.actionableRecommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tailored Elevator Pitch */}
            {analysis.tailoredPitch && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                    Tailored Outreach Pitch
                  </span>
                  <button
                    onClick={handleCopyPitch}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-xs transition-colors"
                  >
                    {copiedPitch ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedPitch ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-600 font-medium italic leading-relaxed">
                  "{analysis.tailoredPitch}"
                </p>
              </div>
            )}

            {/* Predicted Interview Questions */}
            {analysis.interviewPrepQuestions?.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <HelpCircle className="h-3.5 w-3.5 text-purple-600" /> Predicted Interview Questions
                </span>
                <ol className="space-y-1.5 text-xs text-slate-700 font-medium pl-4 list-decimal">
                  {analysis.interviewPrepQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JobFitModal;
