import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    caption: {
        type: String,
        default: "",
    },
    image: {
        type: String,
        required: true,
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    // 🛠️ Proof-of-Work & Professional Artifacts
    githubUrl: {
        type: String,
        default: "",
    },
    liveUrl: {
        type: String,
        default: "",
    },
    tags: [{
        type: String,
    }],
    codeSnippet: {
        type: String,
        default: "",
    },
    codeLanguage: {
        type: String,
        default: "javascript",
    },
    // 🤝 Synergy Collaborator & Peer-Vouching (Anti-Fraud)
    collaboratorUsername: {
        type: String,
        default: "",
    },
    collaboratorRole: {
        type: String,
        default: "Co-Developer",
    },
    vouchStatus: {
        type: String,
        enum: ["none", "pending", "accepted", "declined"],
        default: "none",
    },
    vouchedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    // 💼 Bounties / Freelance Deliverables & Micro-Gigs
    isBounty: {
        type: Boolean,
        default: false,
    },
    bountyAmount: {
        type: String,
        default: "",
    },
    bountyType: {
        type: String,
        enum: ["service_offered", "task_bounty"],
        default: "service_offered",
    }
}, {
    timestamps: true,
});

export const Post = mongoose.model("Post", postSchema);