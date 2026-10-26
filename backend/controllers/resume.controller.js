import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { generateJsonWithGemini, fetchImageAsBase64 } from "../utils/geminiRotator.js";

/**
 * 📄 AI Resume Generator Controller (Multimodal Vision Enabled)
 * Analyzes a user's professional posts, bio, and REAL visual artifact screenshots
 * (UI designs, system architectures, code snippets, terminal outputs) using Google Gemini
 * 2.5 Flash (with automatic 10-key rotator and model cascade) to craft an ATS-ready resume.
 */

/**
 * 📄 Core Multimodal AI Resume Builder
 * Can be invoked internally (e.g. automatically on post create/delete) or via the API.
 */
export const buildResumeForUserInternal = async (targetUserId) => {
    try {
        const user = await User.findById(targetUserId).select("-password");
        if (!user) return null;

        // Fetch user's posts sorted newest first
        const posts = await Post.find({ author: targetUserId }).sort({ createdAt: -1 });

        if (!posts || posts.length === 0) {
            // Starter profile if user has no posts
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
                        skills: ["Networking", "Collaboration"],
                        visualVerified: false
                    }
                ],
                domains: ["Technology", "Software Engineering"],
                visual_insights: [],
                visualArtifactsAnalyzed: 0,
                isVisionAnalyzed: false,
                model: "starter-template",
                generatedAt: new Date()
            };

            user.skills = starterResume.skills;
            user.ai_summary = starterResume.ai_summary;
            user.resume_data = starterResume;
            await user.save();

            return { resume: starterResume, user, success: true };
        }

        // 🖼️ Multimodal Vision Preparation: Concurrently fetch up to 5 post images
        const postsWithImages = posts.filter(p => p.image && typeof p.image === "string").slice(0, 5);
        console.log(`[Auto-Resume] Preparing up to ${postsWithImages.length} visual artifact screenshots for @${user.username}...`);

        const imageFetchPromises = postsWithImages.map(p => fetchImageAsBase64(p.image, 5000));
        const imageResults = await Promise.allSettled(imageFetchPromises);

        const multimodalParts = [];
        let analyzedImagesCount = 0;

        multimodalParts.push({
            text: `You are an elite Principal Technical Recruiter, Staff Architect, and AI Multimodal Resume Strategist.
Candidate Username: "${user.username}"
User Bio: "${user.bio || 'Not provided'}"
Target Role: "${user.targetRole || 'Software Professional'}"

You are provided with BOTH:
1. Written transmission descriptions and project metadata.
2. REAL VISUAL ARTIFACT SCREENSHOTS attached directly to these project transmissions.

CRITICAL MULTIMODAL INSTRUCTIONS - DEEP IMAGE UNDERSTANDING:
Inspect every attached image carefully:
- **UI/UX & Frontend Quality**: Observe the actual design aesthetics, component architecture, styling polish, micro-interactions, responsive design, dashboard density, and design systems shown in screenshots.
- **Architectural & System Diagrams**: If an image contains system architecture, cloud topology (AWS/GCP), microservice workflows, or database schema ER diagrams, extract the technical depth and infrastructure skills.
- **Code & Terminal Proofs**: If an image shows terminal execution, test suites passing, IDE code snippets, or CI/CD pipelines, extract the exact languages, libraries, algorithms, and technical rigor shown.
- **Credentials & Badges**: If an image is a certificate, hackathon award, or peer recognition, incorporate it into their highlights.`
        });

        for (let i = 0; i < postsWithImages.length; i++) {
            const p = postsWithImages[i];
            const fetchRes = imageResults[i];

            if (fetchRes.status === "fulfilled" && fetchRes.value) {
                analyzedImagesCount++;
                multimodalParts.push({
                    text: `\n[VISUAL PROOF-OF-WORK ARTIFACT #${analyzedImagesCount}]
Project Caption: "${p.caption || 'Project release'}"
Tech Tags: ${p.tags?.join(', ') || 'N/A'}
Repo: ${p.githubUrl || 'N/A'} | Live: ${p.liveUrl || 'N/A'}
Code Snippet: ${p.codeSnippet ? p.codeSnippet.substring(0, 250) : 'None'}
The screenshot below shows the actual visual proof-of-work (UI interface, architecture diagram, or code proof) for this project:`
                });
                multimodalParts.push(fetchRes.value);
            }
        }

        const formattedPosts = posts.slice(0, 15).map((p, index) => {
            const dateStr = p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : 'Recent';
            const likesCount = p.likes ? p.likes.length : 0;
            const commentsCount = p.comments ? p.comments.length : 0;
            return `Transmission #${index + 1} (${dateStr}): "${p.caption || 'Project release'}" [Endorsements: ${likesCount} likes, ${commentsCount} comments]`;
        }).join("\n\n");

        const prompt = `Transmissions & Work Log:
${formattedPosts}

Tasks:
1. "headline": Formulate a crisp, modern professional title (e.g. "Senior Full-Stack Engineer & Cloud Architect").
2. "ai_summary": Write a powerful, high-impact 2-3 sentence executive career summary highlighting technical acumen, real achievements, and architectural maturity. Incorporate visually verified capabilities (e.g., modern UI design systems, clean architectural diagrams, responsive dashboards).
3. "skills": Extract the top 8 to 12 technical competencies, frameworks, tools, and methodologies clearly demonstrated in these transmissions and visual artifacts.
4. "highlights": Synthesize 2 to 4 impressive, action-oriented resume accomplishment bullet points based on the posts:
   - "title": Clean title for the project or technical milestone
   - "detail": Action-driven description with quantifiable impact and technologies
   - "skills": Array of 2 to 3 key technologies used in this highlight
   - "visualVerified": true if confirmed via visual inspection of screenshots
5. "domains": Identify 2 to 3 overarching domain specializations (e.g., "Full-Stack Development", "Cloud Infrastructure", "System Design").
6. "visual_insights": An array of 2 to 3 concise bullet points specifically describing what was visually verified from the screenshots.

Return strictly valid raw JSON following this schema:
{
  "headline": "string",
  "ai_summary": "string",
  "skills": ["string"],
  "highlights": [
    {
      "title": "string",
      "detail": "string",
      "skills": ["string"],
      "visualVerified": true
    }
  ],
  "domains": ["string"],
  "visual_insights": ["string"]
}`;

        console.log(`[Auto-Resume] Generating multimodal resume for @${user.username} with ${posts.length} transmissions and ${analyzedImagesCount} visual screenshots...`);
        
        const { data, model, keyIndex } = await generateJsonWithGemini(
            prompt,
            "You are an ATS-compliant AI resume parser and multimodal career architect. Always return strict, valid raw JSON.",
            { parts: analyzedImagesCount > 0 ? multimodalParts : null }
        );

        const sanitizedResume = {
            headline: data.headline || `${user.username} • Technology Professional`,
            ai_summary: data.ai_summary || user.bio || "Dedicated professional with demonstrated technical capability.",
            skills: Array.isArray(data.skills) ? data.skills.slice(0, 12) : [],
            highlights: Array.isArray(data.highlights) ? data.highlights : [],
            domains: Array.isArray(data.domains) ? data.domains : ["Software Engineering"],
            visual_insights: Array.isArray(data.visual_insights) ? data.visual_insights : [],
            visualArtifactsAnalyzed: analyzedImagesCount,
            isVisionAnalyzed: analyzedImagesCount > 0,
            model: model || "gemini-2.5-flash",
            keySlotUsed: keyIndex,
            generatedAt: new Date()
        };

        user.skills = sanitizedResume.skills;
        user.ai_summary = sanitizedResume.ai_summary;
        user.resume_data = sanitizedResume;
        await user.save();

        console.log(`[Auto-Resume] Successfully generated and saved multimodal resume for @${user.username} via ${model}`);
        return { resume: sanitizedResume, user, success: true, model };

    } catch (error) {
        console.error("[Auto-Resume Error]", error);

        // Resilient Fallback: If AI generation fails, synthesize from transmissions & profile metadata
        try {
            const user = await User.findById(targetUserId).populate("posts");
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

                return { resume: fallbackResume, user, success: true, model: "resilience-fallback-engine" };
            }
        } catch (fallbackErr) {
            console.error("[Auto-Resume Resilience Fallback Error]", fallbackErr);
        }

        return { success: false, error };
    }
};

export const generateResume = async (req, res) => {
    try {
        const targetUserId = req.params.id || req.id;

        // Security guard: Users can only generate or modify their own resume
        if (targetUserId.toString() !== req.id.toString()) {
            return res.status(403).json({ 
                message: "Unauthorized: You can only generate or modify your own resume.", 
                success: false 
            });
        }

        const result = await buildResumeForUserInternal(targetUserId);

        if (!result || !result.success) {
            return res.status(500).json({
                success: false,
                message: result?.error?.message || "Failed to generate AI resume"
            });
        }

        return res.status(200).json({
            success: true,
            message: `Resume updated successfully using ${result.model || 'Gemini'}!`,
            resume: result.resume,
            user: result.user
        });
    } catch (error) {
        console.error("[generateResume Error]", error);
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

        // 🖼️ Multimodal Vision: Fetch up to 3 project screenshots for visual verification
        const postsWithImages = posts.filter(p => p.image && typeof p.image === "string").slice(0, 3);
        const imageFetchPromises = postsWithImages.map(p => fetchImageAsBase64(p.image, 4000));
        const imageResults = await Promise.allSettled(imageFetchPromises);

        const multimodalParts = [];
        let analyzedImagesCount = 0;

        multimodalParts.push({
            text: `You are an elite Principal Tech Recruiter, System Architect, and ATS Job Match Auditor.
Target Job Requirements:
"""
${jobDescription.substring(0, 4000)}
"""

Candidate Info:
Candidate Name: ${user.username}
Bio: ${user.bio || 'Not provided'}
Target Title: ${user.targetRole || user.resume_data?.headline || 'Software Engineer'}
Skills on Record: ${user.skills?.join(', ') || 'None'}
Verified Transmissions Log:
${postsText || 'No transmissions logged yet.'}

Inspect BOTH the written candidate record AND the attached visual proof-of-work project screenshots (UI dashboards, architecture diagrams, code proofs).`
        });

        for (let i = 0; i < postsWithImages.length; i++) {
            const p = postsWithImages[i];
            const fetchRes = imageResults[i];
            if (fetchRes.status === "fulfilled" && fetchRes.value) {
                analyzedImagesCount++;
                multimodalParts.push({
                    text: `\n[Candidate Project Screenshot Artifact #${analyzedImagesCount}]
Caption: "${p.caption || 'Project release'}" | Tags: ${p.tags?.join(', ') || 'N/A'}
The screenshot below shows the actual visual proof-of-work (UI interface, architecture diagram, or code proof) for this project:`
                });
                multimodalParts.push(fetchRes.value);
            }
        }

        const prompt = `Evaluate the genuine match percentage between the candidate's demonstrated capabilities (including visual project proofs) and the target job requirements.
Be rigorous, encouraging, and actionable.

Return strictly raw valid JSON adhering to this schema:
{
  "matchScore": 85,
  "matchTier": "Strong Match" | "Moderate Match" | "Developing Match",
  "matchedSkills": ["Skill 1", "Skill 2", "Skill 3"],
  "missingSkills": ["Missing Skill 1", "Missing Skill 2"],
  "visualEvidence": [
    "Specific technical capability visually confirmed from project screenshots (e.g. 'Visually verified: Modern responsive dashboard layout and chart components matching frontend requirements')"
  ],
  "actionableRecommendations": [
    "What specific technical project or transmission they should post to bridge the gap"
  ],
  "tailoredPitch": "A punchy 2-sentence elevator pitch tailored for this application",
  "interviewPrepQuestions": [
    "Technical question 1 based on their stack and the job",
    "System architecture / practical question 2"
  ]
}`;

        console.log(`[Job-Fit Scanner] Running multimodal simulation for @${user.username} with ${analyzedImagesCount} project screenshots...`);
        const { data, model } = await generateJsonWithGemini(
            prompt,
            "You are an ATS Job Match Auditor and Multimodal Career Assessor. Output strictly valid JSON.",
            { parts: analyzedImagesCount > 0 ? multimodalParts : null }
        );

        return res.status(200).json({
            success: true,
            analysis: {
                ...data,
                visualArtifactsAnalyzed: analyzedImagesCount,
                isVisionAnalyzed: analyzedImagesCount > 0
            },
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

