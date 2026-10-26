import sharp from "sharp";
import mongoose from "mongoose";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Notification } from "../models/notification.model.js";
import cloudinary from "../utils/cloudinary.js";
import { getReciverId, io } from "../socket/socket.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

export const addPost = async (req, res) => {
    try {
        const { 
            caption, 
            githubUrl, 
            liveUrl, 
            tags, 
            codeSnippet,
            codeLanguage,
            collaboratorId,
            collaboratorUsername, 
            collaboratorRole,
            isBounty, 
            bountyAmount,
            bountyType 
        } = req.body;
        const authorId = req.id;
        const image = req.file;

        if (!image) return res.status(400).json({ message: "Image is required", success: false });

        const buffer = await sharp(image.buffer)
            .resize({ width: 1080, height: 1080, fit: 'inside' })
            .toFormat('jpeg', { quality: 85 })
            .toBuffer();
            
        const fileUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        const cloudResponse = await cloudinary.uploader.upload(fileUri, {
            folder: 'posts',
        });
        
        const sanitizedCaption = (caption || "").substring(0, 3000);

        // Process tech tags
        let parsedTags = [];
        if (Array.isArray(tags)) {
            parsedTags = tags.map(t => String(t).trim()).filter(Boolean);
        } else if (typeof tags === 'string' && tags.trim()) {
            parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
        }

        const cleanCollabUsername = (collaboratorUsername || "").replace(/^@/, "").trim();
        let targetCollaborator = null;
        if (collaboratorId && isValidId(collaboratorId)) {
            targetCollaborator = await User.findById(collaboratorId);
        } else if (cleanCollabUsername) {
            targetCollaborator = await User.findOne({ 
                username: new RegExp(`^${cleanCollabUsername}$`, 'i') 
            });
        }

        const isLegitCollab = targetCollaborator && targetCollaborator._id.toString() !== authorId;

        const post = await Post.create({ 
            caption: sanitizedCaption, 
            author: authorId, 
            image: cloudResponse.secure_url,
            githubUrl: (githubUrl || "").trim(),
            liveUrl: (liveUrl || "").trim(),
            tags: parsedTags.slice(0, 10),
            codeSnippet: (codeSnippet || "").substring(0, 10000),
            codeLanguage: (codeLanguage || "javascript").toLowerCase(),
            collaborator: isLegitCollab ? targetCollaborator._id : null,
            collaboratorUsername: targetCollaborator ? targetCollaborator.username : cleanCollabUsername,
            collaboratorRole: (collaboratorRole || "Co-Developer").substring(0, 60),
            vouchStatus: isLegitCollab ? "pending" : "none",
            vouchedBy: null,
            isBounty: String(isBounty) === 'true',
            bountyAmount: (bountyAmount || "").trim(),
            bountyType: bountyType === 'task_bounty' ? 'task_bounty' : 'service_offered'
        });
        
        const user = await User.findById(authorId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        }

        // Notify tagged collaborator for peer vouching
        if (targetCollaborator && targetCollaborator._id.toString() !== authorId) {
            await Notification.create({
                recipient: targetCollaborator._id,
                sender: authorId,
                type: 'synergyTag',
                post: post._id,
                message: `${user?.username || 'A colleague'} tagged you as ${post.collaboratorRole} on their transmission: "${sanitizedCaption.substring(0, 50)}...". Please vouch for this project.`
            });

            const collaboratorSocketId = getReciverId(targetCollaborator._id);
            if (collaboratorSocketId) {
                io.to(collaboratorSocketId).emit("notification", {
                    type: 'synergyTag',
                    userId: authorId,
                    userDetails: user,
                    postId: post._id,
                    role: post.collaboratorRole,
                    message: `${user?.username || 'A colleague'} requested your peer vouch for a collaborative transmission.`
                });
            }
        }

        await post.populate({ path: 'author', select: '-password' });
        return res.status(200).json({ message: "Transmission posted successfully", post, success: true });

    } catch (error) {
        console.error("[Add Post Error]", error);
        return res.status(500).json({ message: "Failed to create post", success: false });
    }
};

export const getAllPost = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        // Only fetch posts from self, followed professionals, or posts where followed professionals are verified collaborators
        const allowedAuthors = [...(user.following || []), userId];

        const posts = await Post.find({
            $or: [
                { author: { $in: allowedAuthors } },
                { collaborator: { $in: allowedAuthors }, vouchStatus: 'accepted' }
            ]
        })
            .sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilepicture bio' })
            .populate({ path: 'collaborator', select: 'username profilepicture bio' })
            .populate({ path: 'comments', sort: { createdAt: -1 }, populate: { path: 'author', select: 'username profilepicture' } })
            .populate({ path: 'likes', select: 'username profilepicture' });

        return res.status(200).json({ posts, success: true });
    } catch (error) {
        console.error("[Get All Posts Error]", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const getUserPost = async (req, res) => {
    try {
        const userId = req.id;
        const posts = await Post.find({ 
            $or: [
                { author: userId },
                { collaborator: userId, vouchStatus: 'accepted' }
            ] 
        })
            .sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilepicture bio' })
            .populate({ path: 'collaborator', select: 'username profilepicture bio' })
            .populate({ path: 'comments', sort: { createdAt: -1 }, populate: { path: 'author', select: 'username profilepicture' } })
            .populate({ path: 'likes', select: 'username profilepicture' });

        return res.status(200).json({ posts, success: true });
    } catch (error) {
        console.error("[Get User Posts Error]", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const likePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const likeUserId = req.id;

        if (!isValidId(postId)) {
            return res.status(400).json({ message: "Invalid post ID", success: false });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false });
        
        await post.updateOne({ $addToSet: { likes: likeUserId } });

        // Real-time socket notification if someone else likes
        const postOwnerId = post.author.toString();
        if (postOwnerId !== likeUserId) {
            const user = await User.findById(likeUserId).select('username profilepicture');
            if (user) {
                await Notification.create({
                    recipient: postOwnerId,
                    sender: likeUserId,
                    type: 'like',
                    post: postId,
                    message: `${user.username} liked your transmission`
                });
                
                const postOwnerSocketId = getReciverId(postOwnerId);
                if (postOwnerSocketId) {
                    io.to(postOwnerSocketId).emit("notification", {
                        type: 'like',
                        userId: likeUserId,
                        userDetails: user,
                        postId: postId,
                        message: `${user.username} liked your transmission`,
                    });
                }
            }
        }

        return res.status(200).json({ message: "Post liked successfully", success: true });
    } catch (error) {
        console.error("[Like Post Error]", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const dislikePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const dislikeUserId = req.id;

        if (!isValidId(postId)) {
            return res.status(400).json({ message: "Invalid post ID", success: false });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false });
        
        await post.updateOne({ $pull: { likes: dislikeUserId } });

        const postOwnerId = post.author.toString();
        if (postOwnerId !== dislikeUserId) {
            await Notification.deleteOne({
                recipient: postOwnerId,
                sender: dislikeUserId,
                type: 'like',
                post: postId
            });
        }
        return res.status(200).json({ message: "Post unliked successfully", success: true });
    } catch (error) {
        console.error("[Dislike Post Error]", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const { comment: msg } = req.body;
        const commentAuthorId = req.id;

        if (!isValidId(postId)) {
            return res.status(400).json({ message: "Invalid post ID", success: false });
        }

        if (!msg || !msg.trim()) {
            return res.status(400).json({ message: "Comment content cannot be empty", success: false });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false });

        const sanitizedText = msg.trim().substring(0, 1000);
        const comment = await Comment.create({ 
            author: commentAuthorId, 
            post: postId, 
            text: sanitizedText 
        });
        
        await comment.populate({ path: 'author', select: 'username profilepicture' });
        post.comments.push(comment._id);
        await post.save();

        const postOwnerId = post.author.toString();
        if (postOwnerId !== commentAuthorId) {
            const user = await User.findById(commentAuthorId).select('username profilepicture');
            if (user) {
                await Notification.create({
                    recipient: postOwnerId,
                    sender: commentAuthorId,
                    type: 'comment',
                    post: postId,
                    message: `${user.username} replied to your transmission`
                });

                const postOwnerSocketId = getReciverId(postOwnerId);
                if (postOwnerSocketId) {
                    io.to(postOwnerSocketId).emit("notification", {
                        type: 'comment',
                        userId: commentAuthorId,
                        userDetails: user,
                        postId: postId,
                        message: `${user.username} replied to your transmission`,
                    });
                }
            }
        }

        return res.status(200).json({ message: "Comment added successfully", comment, success: true });
    } catch (error) {
        console.error("[Add Comment Error]", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const getCommentsOfPost = async (req, res) => {
    try {
        const postId = req.params.id;
        if (!isValidId(postId)) {
            return res.status(400).json({ message: "Invalid post ID", success: false });
        }

        const comments = await Comment.find({ post: postId })
            .sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilepicture' });
            
        return res.status(200).json({ comments: comments || [], success: true });
    } catch (error) {
        console.error("[Get Comments Error]", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        if (!isValidId(postId)) {
            return res.status(400).json({ message: "Invalid post ID", success: false });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false });
        
        // Strict ID authorization
        if (post.author.toString() !== authorId) {
            return res.status(403).json({ message: "You are not authorized to delete this post", success: false });
        }

        await Post.findByIdAndDelete(postId);
        
        const user = await User.findById(authorId);
        if (user) {
            user.posts = user.posts.filter((id) => id.toString() !== postId);
            await user.save();
        }

        await Comment.deleteMany({ post: postId });
        await Notification.deleteMany({ post: postId });

        return res.status(200).json({ message: "Post deleted successfully", success: true });
    } catch (error) {
        console.error("[Delete Post Error]", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const editPostCaption = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const { caption } = req.body;

        if (!isValidId(postId)) {
            return res.status(400).json({ message: "Invalid post ID", success: false });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false });
        
        // Strict ID authorization
        if (post.author.toString() !== authorId) {
            return res.status(403).json({ message: "You are not authorized to edit this post", success: false });
        }

        post.caption = (caption || "").substring(0, 3000);
        await post.save();
        
        await post.populate({ path: 'author', select: '-password' });
        await post.populate({ path: 'likes', select: 'username profilepicture' });

        return res.status(200).json({ message: "Post caption updated successfully", success: true, post });
    } catch (error) {
        console.error("[Edit Post Error]", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.id;

        if (!isValidId(commentId)) {
            return res.status(400).json({ message: "Invalid comment ID", success: false });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found", success: false });

        const post = await Post.findById(comment.post);
        if (!post) return res.status(404).json({ message: "Parent post not found", success: false });

        // Authorization: only comment author or post owner
        if (comment.author.toString() !== userId && post.author.toString() !== userId) {
            return res.status(403).json({ message: "You are not authorized to delete this comment", success: false });
        }

        await Comment.findByIdAndDelete(commentId);
        
        post.comments = post.comments.filter(id => id.toString() !== commentId);
        await post.save();

        return res.status(200).json({ message: "Comment deleted successfully", success: true, commentId });
    } catch (error) {
        console.error("[Delete Comment Error]", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        if (!isValidId(postId)) {
            return res.status(400).json({ message: "Invalid post ID", success: false });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false });

        const user = await User.findById(authorId);
        if (!user) return res.status(404).json({ message: "User not found", success: false });

        const isBookmarked = user.bookmarks.some(id => id.toString() === postId);

        if (isBookmarked) {
            await user.updateOne({ $pull: { bookmarks: postId } });
            const updatedUser = await User.findById(authorId);
            return res.status(200).json({
                message: "Post unbookmarked successfully",
                success: true,
                bookmarks: updatedUser.bookmarks, 
            });
        } else {
            await user.updateOne({ $addToSet: { bookmarks: postId } });
            const updatedUser = await User.findById(authorId);
            return res.status(200).json({
                message: "Post bookmarked successfully",
                success: true,
                bookmarks: updatedUser.bookmarks, 
            });
        }
    } catch (error) {
        console.error("[Bookmark Error]", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

/**
 * 🤝 Peer Collaborator Vouching (Anti-Fraud Reputation)
 * The tagged collaborator can accept or decline attribution.
 */
export const vouchPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.id;
        const { action } = req.body; // 'accept' or 'decline'

        if (!isValidId(postId)) {
            return res.status(400).json({ message: "Invalid post ID", success: false });
        }

        const post = await Post.findById(postId).populate('author', 'username profilepicture');
        if (!post) {
            return res.status(404).json({ message: "Transmission not found", success: false });
        }

        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        // Verify that this user is indeed the tagged collaborator
        const isTaggedByUsername = post.collaboratorUsername && 
            post.collaboratorUsername.toLowerCase() === currentUser.username.toLowerCase();
        const isTaggedById = (post.collaborator && post.collaborator.toString() === userId) ||
            (post.vouchedBy && post.vouchedBy.toString() === userId);

        if (!isTaggedByUsername && !isTaggedById) {
            return res.status(403).json({ 
                message: "You are not designated as the collaborator on this transmission.", 
                success: false 
            });
        }

        if (action === "accept") {
            post.vouchStatus = "accepted";
            post.vouchedBy = userId;
            post.collaborator = userId;
            await post.save();

            // When accepted, add project to collaborator's profile so it appears on both profiles with verified synergy!
            const collaboratorUser = await User.findById(userId);
            if (collaboratorUser && !collaboratorUser.posts.includes(post._id)) {
                collaboratorUser.posts.push(post._id);
                await collaboratorUser.save();
            }

            // Notify the original author
            await Notification.create({
                recipient: post.author._id,
                sender: userId,
                type: 'vouchAccepted',
                post: post._id,
                message: `@${currentUser.username} officially vouched for your collaboration on "${post.caption.substring(0, 40)}...". Synergy badge verified!`
            });

            const authorSocketId = getReciverId(post.author._id);
            if (authorSocketId) {
                io.to(authorSocketId).emit("notification", {
                    type: 'vouchAccepted',
                    userId: userId,
                    userDetails: currentUser,
                    postId: post._id,
                    message: `@${currentUser.username} verified peer synergy on your transmission!`
                });
            }

            return res.status(200).json({ 
                message: "Collaboration verified! Synergy badge is now active.", 
                success: true, 
                post 
            });
        } else {
            post.vouchStatus = "declined";
            await post.save();

            return res.status(200).json({ 
                message: "Collaboration vouch declined.", 
                success: true, 
                post 
            });
        }
    } catch (error) {
        console.error("[Vouch Post Error]", error);
        return res.status(500).json({ message: "Server error updating vouch", success: false });
    }
};

/**
 * 💼 Get All Open Bounties & Micro-Gigs
 */
export const getBountyPosts = async (req, res) => {
    try {
        const { type } = req.query; // 'service_offered', 'task_bounty', or undefined (all)
        
        const filter = { isBounty: true };
        if (type && ['service_offered', 'task_bounty'].includes(type)) {
            filter.bountyType = type;
        }

        const bounties = await Post.find(filter)
            .sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilepicture bio openToOpportunities targetRole hourlyRate' })
            .populate({ path: 'comments', sort: { createdAt: -1 }, populate: { path: 'author', select: 'username profilepicture' } });

        return res.status(200).json({
            success: true,
            bounties
        });
    } catch (error) {
        console.error("[Get Bounties Error]", error);
        return res.status(500).json({ message: "Server error fetching bounties", success: false });
    }
};