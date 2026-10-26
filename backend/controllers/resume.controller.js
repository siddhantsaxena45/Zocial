import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { generateJsonWithGemini } from "../utils/geminiRotator.js";

/**
 * 📄 AI Resume Generator Controller
 * Analyzes a user's professional posts, bio, and interactions using Google Gemini 2.5 Flash
 * (with automatic fallback to Gemini 3.8/3.5 Flash and a 10-key rotator) to craft
 * an ATS-ready professional resume.
 */

export const generateResume = async (req, res) => {
    try {
        const targetUserId = req.params.id || req.id;
        const user = await User.findById(targetUserId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        // Fetch user's posts sorted newest first
        const posts = await Post.find({ author: targetUserId }).sort({ createdAt: -1 });

        if (!posts || posts.length === 0) {
            // Generate starter profile if user doesn't have posts yet
            const starterResume = {
                headline: user.bio || `${user.username} • Professional Specialist`,
                ai_summary: user.bio 
                    ? `Passionate technology professional with expertise in modern digital solutions. Dedicated to continuous learning and community engagement.`
                    : `${user.username} is an aspiring technology professional on Zocial. Publish project transmissions to automatically generate a rich AI resume.`,
                skills: user.skills && user.skills.length > 0 ? user.skills : ["Software Engineering", "Communication", "Problem Solving", "Modern Web"],
                highlights: [
                    {
                        title: "Active Zocial Network Contributor",
                        detail: `Joined the Zocial professional network with ${user.followers?.length || 0} connections and building technical portfolio.`,
                        skills: ["Networking", "Collaboration"]
                    }
                ],
                domains: ["Technology", "Software Engineering"],
                model: "starter-template",
                generatedAt: new Date()
            };

            user.skills = starterResume.skills;
            user.ai_summary = starterResume.ai_summary;
            user.resume_data = starterResume;
            await user.save();

            return res.status(200).json({
                success: true,
                message: "Created starter resume profile. Add technical posts for an AI deep dive!",
                resume: starterResume,
                user
            });
        }

        // Format posts for Gemini prompt
        const formattedPosts = posts.slice(0, 15).map((p, index) => {
            const dateStr = p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : 'Recent';
            const likesCount = p.likes ? p.likes.length : 0;
            const commentsCount = p.comments ? p.comments.length : 0;
            return `Transmission #${index + 1} (${dateStr}): "${p.caption || 'Project release'}" [Endorsements: ${likesCount} likes, ${commentsCount} comments]`;
        }).join("\n\n");

        const prompt = `You are a world-class executive tech recruiter and resume strategist.
Analyze the following professional social media transmissions and profile data for "${user.username}".
User Bio: "${user.bio || 'Not provided'}"

Transmissions & Work Log:
${formattedPosts}

Tasks:
1. "headline": Formulate a crisp, modern professional title (e.g. "Senior Full-Stack Engineer & Cloud Architect").
2. "ai_summary": Write a powerful, high-impact 2-3 sentence executive career summary highlighting technical acumen, real achievements, and architectural maturity.
3. "skills": Extract the top 6 to 10 technical competencies, frameworks, tools, and methodologies clearly demonstrated in these transmissions.
4. "highlights": Synthesize 2 to 4 impressive, action-oriented resume accomplishment bullet points based on the posts:
   - "title": Clean title for the project or technical milestone
   - "detail": Action-driven description with quantifiable impact and technologies
   - "skills": Array of 2 to 3 key technologies used in this highlight
5. "domains": Identify 2 to 3 overarching domain specializations (e.g., "Full-Stack Development", "Cloud Infrastructure", "System Design").

Return strictly valid raw JSON following this schema:
{
  "headline": "string",
  "ai_summary": "string",
  "skills": ["string"],
  "highlights": [
    {
      "title": "string",
      "detail": "string",
      "skills": ["string"]
    }
  ],
  "domains": ["string"]
}`;

        console.log(`[AI Resume] Generating resume for @${user.username} with ${posts.length} transmissions...`);
        const { data, model, keyIndex } = await generateJsonWithGemini(
            prompt,
            "You are an ATS-compliant AI resume parser and executive career writer. Always return strict, valid raw JSON."
        );

        // Sanitize and structure result
        const sanitizedResume = {
            headline: data.headline || `${user.username} • Technology Professional`,
            ai_summary: data.ai_summary || user.bio || "Dedicated professional with demonstrated technical capability.",
            skills: Array.isArray(data.skills) ? data.skills.slice(0, 12) : [],
            highlights: Array.isArray(data.highlights) ? data.highlights : [],
            domains: Array.isArray(data.domains) ? data.domains : ["Software Engineering"],
            model: model || "gemini-2.5-flash",
            keySlotUsed: keyIndex,
            generatedAt: new Date()
        };

        // Persist to user record in MongoDB
        user.skills = sanitizedResume.skills;
        user.ai_summary = sanitizedResume.ai_summary;
        user.resume_data = sanitizedResume;
        await user.save();

        console.log(`[AI Resume] Successfully generated and saved resume for @${user.username} using ${model} (Key #${keyIndex})`);

        return res.status(200).json({
            success: true,
            message: `Resume generated successfully using ${model}`,
            resume: sanitizedResume,
            user
        });

    } catch (error) {
        console.error("[AI Resume Error]", error);

        // Resilient Fallback: If AI generation fails, synthesize from transmissions & profile metadata
        try {
            const user = await User.findById(req.params.id || req.id).populate("posts");
            if (user) {
                const userPosts = user.posts || [];
                const fallbackResume = {
                    headline: user.targetRole || `${user.username} • Creative & Technology Professional`,
                    ai_summary: user.bio || `${user.username} demonstrates a strong inclination towards independent creation and project execution, translating vision into tangible outcomes.`,
                    skills: user.skills && user.skills.length > 0 ? user.skills : ["Software Engineering", "Project Execution", "Creative Direction", "Full-Stack Development"],
                    highlights: userPosts.length > 0 ? userPosts.slice(0, 3).map((p, i) => ({
                        title: p.caption ? p.caption.split("\n")[0].substring(0, 60) : `Project Transmission #${i + 1}`,
                        detail: p.caption ? p.caption.substring(0, 200) : "Demonstrated hands-on technical execution and verified project milestone.",
                        skills: p.tags && p.tags.length > 0 ? p.tags.slice(0, 3) : ["Development", "Innovation"]
                    })) : [
                        {
                            title: "Independent Project Execution",
                            detail: "Demonstrated creative and technical capabilities through portfolio development and digital transmissions.",
                            skills: ["Problem Solving", "Execution"]
                        }
                    ],
                    domains: ["Digital Innovation", "Software Engineering"],
                    model: "resilience-fallback-engine",
                    keySlotUsed: 1,
                    generatedAt: new Date()
                };

                user.resume_data = fallbackResume;
                await user.save();

                return res.status(200).json({
                    success: true,
                    message: "Resume generated successfully (Resilient Synthesis)",
                    resume: fallbackResume,
                    user
                });
            }
        } catch (fallbackErr) {
            console.error("[AI Resume Resilience Fallback Error]", fallbackErr);
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to generate AI resume"
        });
    }
};

export const getResume = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId)
            .select("-password")
            .populate({
                path: "posts",
                sort: { createdAt: -1 },
                select: "caption image likes comments createdAt"
            });

        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        return res.status(200).json({
            success: true,
            resume: user.resume_data || null,
            user
        });
    } catch (error) {
        console.error("[Get Resume Error]", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * 🎯 AI Job-Fit Simulator & Missing Skills Scanner
 * Analyzes any target Job Description against the candidate's real proof-of-work
 * posts and resume to yield an ATS match score, gaps, and actionable tips.
 */
export const simulateJobFit = async (req, res) => {
    try {
        const userId = req.id;
        const { jobDescription } = req.body;

        if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide a target job description or role requirements." 
            });
        }

        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const posts = await Post.find({ author: userId }).sort({ createdAt: -1 }).limit(10);
        const postsText = posts.map((p, i) => `#${i + 1}: "${p.caption}" [Tags: ${p.tags?.join(', ') || 'N/A'}, Repo: ${p.githubUrl || 'N/A'}]`).join("\n");

        const prompt = `You are a Principal Tech Recruiter and ATS Auditor.
A candidate is evaluating their fit for this target job opportunity:
TARGET JOB DESCRIPTION / REQUIREMENTS:
"""
${jobDescription.substring(0, 4000)}
"""

CANDIDATE PROVEN RECORD ON ZOCIAL:
Candidate Name: ${user.username}
Bio: ${user.bio || 'Not provided'}
Target Title: ${user.targetRole || user.resume_data?.headline || 'Software Engineer'}
Skills on Record: ${user.skills?.join(', ') || 'None'}
Verified Transmissions & Proof-of-Work:
${postsText || 'No transmissions logged yet.'}

Analyze the genuine match percentage between their demonstrated capabilities and the job requirements.
Be rigorous, encouraging, and actionable.

Return strictly raw valid JSON adhering to this schema:
{
  "matchScore": 85,
  "matchTier": "Strong Match" | "Moderate Match" | "Developing Match",
  "matchedSkills": ["Skill 1", "Skill 2", "Skill 3"],
  "missingSkills": ["Missing Skill 1", "Missing Skill 2"],
  "actionableRecommendations": [
    "What specific technical project or transmission they should post to bridge the gap"
  ],
  "tailoredPitch": "A punchy 2-sentence elevator pitch tailored for this application",
  "interviewPrepQuestions": [
    "Technical question 1 based on their stack and the job",
    "System architecture / practical question 2"
  ]
}`;

        console.log(`[Job-Fit Scanner] Running simulation for @${user.username}...`);
        const { data, model } = await generateJsonWithGemini(
            prompt,
            "You are an ATS Job Match Auditor. Output strictly valid JSON."
        );

        return res.status(200).json({
            success: true,
            analysis: data,
            model
        });

    } catch (error) {
        console.error("[Job Fit Simulation Error]", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to simulate job fit."
        });
    }
};

