import mongoose from "mongoose";

const engagementSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    type: { type: String, enum: ['like', 'comment', 'received_like', 'received_comment'], required: true },
}, { timestamps: true });

export const Engagement = mongoose.model("Engagement", engagementSchema);
