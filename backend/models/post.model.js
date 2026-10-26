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
    // 🤝 Synergy Collaborator (Proof of Teamwork)
    collaboratorUsername: {
        type: String,
        default: "",
    },
    // 💼 Bounties / Freelance Deliverables
    isBounty: {
        type: Boolean,
        default: false,
    },
    bountyAmount: {
        type: String,
        default: "",
    }
}, {
    timestamps: true,
});

export const Post = mongoose.model("Post", postSchema);