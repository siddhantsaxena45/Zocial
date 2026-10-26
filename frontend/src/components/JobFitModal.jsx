import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { 
  Sparkles, Loader2, CheckCircle2, AlertTriangle, 
  HelpCircle, Copy, Check, Target, Lightbulb 
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
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              AI Job-Fit Simulator & Skills Gap Scanner
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              Gemini Powered
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Description / Instructions */}
        <p className="text-xs text-slate-500 font-medium">
          Paste any Job Description or target role below. Gemini will audit your real Zocial transmissions, calculate an ATS match score, identify missing skills, and suggest projects to build to win the interview.
        </p>

        {/* Input Area */}
        <div className="space-y-3">
          <Textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste Job Description here (e.g. 'Senior Full-Stack Engineer at Stripe... Requirements: React, Node.js, Distributed Systems, Microservices...')"
            className="text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-indigo-500 resize-none min-h-[110px]"
            rows={4}
          />

          <Button
            onClick={handleSimulate}
            disabled={isScanning || !jobDescription.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs gap-2 py-2.5 shadow-md shadow-indigo-100"
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
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            {/* Score & Tier Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${getScoreColor(analysis.matchScore)}`}>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Calculated ATS Match</span>
                <span className="text-sm font-black uppercase tracking-wide">{analysis.matchTier || "Analysis Complete"}</span>
              </div>
              <div className="text-3xl font-black">
                {analysis.matchScore}%
              </div>
            </div>

            {/* Matched vs Missing Skills Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Matched */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Proven on Zocial
                </span>
                <div className="flex flex-wrap gap-1">
                  {analysis.matchedSkills?.map((skill, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-white text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      {skill}
                    </span>
                  )) || <span className="text-slate-400">None detected</span>}
                </div>
              </div>

              {/* Missing Gaps */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 space-y-2">
                <span className="font-bold text-amber-800 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Missing Proof-of-Work
                </span>
                <div className="flex flex-wrap gap-1">
                  {analysis.missingSkills?.map((skill, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-white text-amber-800 text-[10px] font-bold border border-amber-200">
                      {skill}
                    </span>
                  )) || <span className="text-slate-400">None</span>}
                </div>
              </div>
            </div>

            {/* Actionable Project Suggestions */}
            {analysis.actionableRecommendations?.length > 0 && (
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100/70 space-y-2">
                <span className="font-bold text-indigo-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <Lightbulb className="h-3.5 w-3.5 text-indigo-600" /> Actionable Proof-of-Work Recommendations
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
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                    Tailored Outreach Pitch
                  </span>
                  <button
                    onClick={handleCopyPitch}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    {copiedPitch ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedPitch ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-600 font-medium italic">
                  "{analysis.tailoredPitch}"
                </p>
              </div>
            )}

            {/* Predicted Interview Questions */}
            {analysis.interviewPrepQuestions?.length > 0 && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
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
