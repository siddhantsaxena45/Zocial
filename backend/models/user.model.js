import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        default: "",
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilepicture: {
        type: String,
        default: "",
    },
    bio: {
        type: String,
        default: "",
    },
    // 💼 Professional Profile Fields
    targetRole: {
        type: String,
        default: "",
    },
    openToOpportunities: {
        type: Boolean,
        default: false,
    },
    hourlyRate: {
        type: String,
        default: "",
    },
    githubProfile: {
        type: String,
        default: "",
    },
    portfolioUrl: {
        type: String,
        default: "",
    },
    skills: [{
        type: String,
    }],
    ai_summary: {
        type: String,
        default: "",
    },
    resume_data: {
        type: Object,
        default: null
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
    }],
    bookmarks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
    }],
    resetPasswordToken: String,
    resetPasswordExpires: Date,

}, { timestamps: true });

export const User = mongoose.model("User", userSchema);