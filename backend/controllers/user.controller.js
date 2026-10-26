
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { Post } from "../models/post.model.js";
import { ConnectionRequest } from "../models/connectionRequest.model.js";
import { Notification } from "../models/notification.model.js";
import { Conversation } from "../models/conversation.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { getReciverId, io } from "../socket/socket.js";
import crypto from "crypto";
import mongoose from "mongoose";
import { generateJsonWithGemini } from "../utils/geminiRotator.js";

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required", success: false });
        }
        if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: "Invalid payload format", success: false });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters", success: false });
        }
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists", success: false })
        }
        let user2 = await User.findOne({ username });
        if (user2) {
            return res.status(400).json({ message: "Username already exists", success: false })
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = await User.create({
            username,
            email,
            password: hashedPassword,
        });
        return res.status(200).json({ message: "User created successfully", success: true })
    }
    catch (error) {
        console.error("[Registration Error]", error);
        return res.status(500).json({ message: "Internal server error during registration", success: false });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required", success: false });
        }
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: "Invalid payload format", success: false });
        }
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist", success: false })
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials", success: false })
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
        const populatedPost = await Promise.all(user.posts.map(async (postId) => {
            const post = await Post.findById(postId);
            if (post.author.equals(user._id)) {
                return post
            }
            return null;

        }));
        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilepicture: user.profilepicture,
            bio: user.bio,
            followers: [...new Set((user.followers || []).map(id => id.toString()))],
            following: [...new Set((user.following || []).map(id => id.toString()))],
            posts: populatedPost,
            bookmarks: user.bookmarks
        }
        return res.cookie("token", token, {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60 * 1000
        }).status(200).json({ message: `${user.username} logged in successfully`, success: true, user });


    }
    catch (error) {
        console.error("[Login Error]", error);
        return res.status(500).json({ message: "Internal server error during login", success: false });
    }

}

export const logout = async (req, res) => {
    try {
        return res.cookie("token", "", {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 0
        }).json({ message: "User logged out successfully", success: true });
    }
    catch (error) {
        console.error("[Logout Error]", error);
        return res.status(500).json({ message: "Internal server error during logout", success: false });
    }
}

export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID", success: false });
        }
        let user = await User.findById(userId)
            .populate({ 
                path: "posts", 
                sort: { createdAt: -1 },
                populate: [
                    { path: 'author', select: 'username profilepicture' },
                    { path: 'comments', sort: { createdAt: -1 }, populate: { path: 'author', select: 'username profilepicture' } },
                    { path: 'likes', select: 'username profilepicture' }
                ]
            })
            .populate({ path: "bookmarks", sort: { createdAt: -1 } })
            .populate({ path: "followers", select: "username profilepicture bio" })
            .populate({ path: "following", select: "username profilepicture bio" });
            
        // De-duplicate for data integrity
        const userObj = user.toObject();
        userObj.followers = [...new Set((userObj.followers || []).map(id => id._id ? id._id.toString() : id.toString()))];
        userObj.following = [...new Set((userObj.following || []).map(id => id._id ? id._id.toString() : id.toString()))];

        return res.status(200).json({ user: userObj, success: true });
    }
    catch (error) {
        console.error("[Get Profile Error]", error);
        return res.status(500).json({ message: "Internal server error fetching profile", success: false });
    }
}

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { 
            bio, 
            gender, 
            openToOpportunities, 
            targetRole, 
            hourlyRate, 
            githubProfile, 
            portfolioUrl 
        } = req.body;
        const profilePicture = req.file;

        let cloudResponse;
        if (profilePicture) {
            const fileuri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileuri, {
                folder: 'profile_pictures',
            });
        }
        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }
        if (bio !== undefined) user.bio = String(bio).substring(0, 1000);
        if (gender !== undefined) user.gender = String(gender).substring(0, 50);
        if (targetRole !== undefined) user.targetRole = String(targetRole).substring(0, 100);
        if (hourlyRate !== undefined) user.hourlyRate = String(hourlyRate).substring(0, 50);
        if (githubProfile !== undefined) user.githubProfile = String(githubProfile).trim().substring(0, 200);
        if (portfolioUrl !== undefined) user.portfolioUrl = String(portfolioUrl).trim().substring(0, 200);
        if (openToOpportunities !== undefined) {
            user.openToOpportunities = String(openToOpportunities) === 'true' || openToOpportunities === true;
        }
        if (profilePicture && cloudResponse) {
            user.profilepicture = cloudResponse.secure_url;
        }
        await user.save();
        return res.status(200).json({ message: "Profile updated successfully", success: true, user });
    }
    catch (error) {
        console.error("[Edit Profile Error]", error);
        return res.status(500).json({ message: "Internal server error updating profile", success: false });
    }
}

export const getSuggestedUsers = async (req, res) => {
    try {
        const currentUser = await User.findById(req.id).select("skills following");
        if (!currentUser) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        // 🛑 We NO LONGER filter out followed users here!
        // We need the entire dataset to populate the Global Search Bar cache.
        // The frontend <SuggestedUsers /> widget will handle the omission filtering itself.

        let suggestedUsers = await User.find({ _id: { $ne: req.id } }).select("-password");

        if (!suggestedUsers || suggestedUsers.length === 0) {
            return res.status(200).json({ users: [], success: true });
        }

        // 🧠 Data Science Matchmaking: Sort by ML Skill overlap
        const mySkills = currentUser.skills || [];
        
        suggestedUsers.sort((a, b) => {
            const aSkills = a.skills || [];
            const bSkills = b.skills || [];
            
            const aOverlap = aSkills.filter(skill => mySkills.includes(skill)).length;
            const bOverlap = bSkills.filter(skill => mySkills.includes(skill)).length;
            
            return bOverlap - aOverlap; // Descending order (highest overlap first)
        });

        // Return the top 50 matches for the global search cache
        return res.status(200).json({ users: suggestedUsers.slice(0, 50), success: true });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}

export const getFollowingUsers = async (req, res) => {
    try {
        const user = await User.findById(req.id).populate({
            path: 'following',
            select: 'username profilepicture bio'
        });
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }
        return res.status(200).json({ users: user.following, success: true });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}

export const getChatPartners = async (req, res) => {
    try {
        const userId = req.id;
        
        // 1. Get current user's following list (as strings for easy comparison)
        const currentUser = await User.findById(userId).select('following');
        if (!currentUser) {
            return res.status(404).json({ message: "User not found", success: false });
        }
        const followingIds = currentUser.following.map(id => id.toString());

        // 2. Identify Mutual Connections (Users I follow who ALSO follow me)
        // A user follows me if I am in their 'following' list (Wait, no! If I am in their 'following' list, they follow me. Correct.)
        // No, back up: A user follows me if 'userId' is in THEIR 'following' list. 
        // Our 'followOrUnfollow' logic: 
        // followkarnewala (A) follows jiskofollowkarrhe (B)
        // A.following push B
        // B.followers push A
        
        // So User B is a MUTUAL connection for User A if:
        // 1. B is in A.following
        // 2. A is in B.following
        
        const mutualConnections = await User.find({
            _id: { $in: followingIds },
            following: userId
        }).select('_id username profilepicture bio followers');

        // Fetch users from past conversations
        const conversations = await Conversation.find({ participants: userId });
        const partnerIdsFromConversations = conversations.flatMap(c => c.participants.filter(id => id.toString() !== userId));

        const mutualIds = new Set(mutualConnections.map(u => u._id.toString()));
        
        // Find users from past conversations who aren't in mutualConnections
        const pastPartnerIds = [...new Set(partnerIdsFromConversations)].filter(id => !mutualIds.has(id.toString()));
        
        const pastPartners = await User.find({
            _id: { $in: pastPartnerIds }
        }).select('_id username profilepicture bio followers');

        const partners = [
            ...mutualConnections.map(u => ({ ...u.toObject(), isMutual: true })),
            ...pastPartners.map(u => ({ ...u.toObject(), isMutual: false }))
        ];

        return res.status(200).json({ users: partners, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}
export const followOrUnfollow = async (req, res) => {
    try {
        const followkarnewala = req.id;
        const jiskofollowkarrhe = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(jiskofollowkarrhe)) {
            return res.status(400).json({ message: "Invalid user ID", success: false });
        }
        if (followkarnewala === jiskofollowkarrhe) {
            return res.status(400).json({ message: "You cannot follow yourself", success: false });
        }
        let user = await User.findById(followkarnewala);
        let targetUser = await User.findById(jiskofollowkarrhe);
        if (!user || !targetUser) {
            return res.status(404).json({ message: "User not found", success: false });
        }
        let isFollowing = user.following.includes(jiskofollowkarrhe);
        if (isFollowing) {
            //unfollow
            await Promise.all([
                User.updateOne({ _id: followkarnewala }, { $pull: { following: jiskofollowkarrhe } }),
                User.updateOne({ _id: jiskofollowkarrhe }, { $pull: { followers: followkarnewala } }),
                // Fix Connection Logic: Breaking a follow also breaks mutual synergy
                ConnectionRequest.deleteMany({
                    $or: [
                        { sender: followkarnewala, receiver: jiskofollowkarrhe },
                        { sender: jiskofollowkarrhe, receiver: followkarnewala }
                    ]
                }),
                Notification.deleteOne({ recipient: jiskofollowkarrhe, sender: followkarnewala, type: 'follow' })
            ])

             // socket io for unfollow notification
             const unfollower = await User.findById(followkarnewala).select('username profilepicture');
             const notification = {
                 type: 'unfollow',
                 userId: followkarnewala,
                 userDetails: unfollower,
                 message: `${unfollower.username} unfollowed you`,
             }
             const targetSocketId = getReciverId(jiskofollowkarrhe);
             if (targetSocketId) {
                 io.to(targetSocketId).emit("notification", notification);
             }

            return res.status(200).json({ message: "User unfollowed successfully", success: true });
        }
        else {
            //follow
            await Promise.all([
                User.updateOne({ _id: followkarnewala }, { $addToSet: { following: jiskofollowkarrhe } }),
                User.updateOne({ _id: jiskofollowkarrhe }, { $addToSet: { followers: followkarnewala } })
            ])

             // create DB notification
             const followerUser = await User.findById(followkarnewala).select('username profilepicture');
             await Notification.create({
                 recipient: jiskofollowkarrhe,
                 sender: followkarnewala,
                 type: 'follow',
                 message: `${followerUser.username} followed you`
             });

             // socket io for follow notification
             const notification = {
                 type: 'follow',
                 userId: followkarnewala,
                 userDetails: followerUser,
                 message: `${followerUser.username} followed you`,
             }
             const targetSocketId = getReciverId(jiskofollowkarrhe);
             if (targetSocketId) {
                 io.to(targetSocketId).emit("notification", notification);
             }

            return res.status(200).json({ message: "User followed successfully", success: true });
        }


    }
    catch (error) {
        console.error("[Follow/Unfollow Error]", error);
        return res.status(500).json({ message: "Internal server error during connection change", success: false });
    }
}

import { OAuth2Client } from "google-auth-library";

export const googleLogin = async (req, res) => {
    try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const { token } = req.body;

        console.log("Verifying ID Token with Client ID:", process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...");

        // 1. Verify token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });


        const { email, name, picture } = ticket.getPayload();

        // 2. Find or create user
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                username: name,
                email,
                profilepicture: picture,
                password: "GOOGLE_AUTH",
            });
        } else {
            // Update profile picture if user exists to ensure sync
            user.profilepicture = picture;
            await user.save();
        }

        const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });

        const populatedPost = await Promise.all(user.posts.map(async (postId) => {
            const post = await Post.findById(postId);
            return post?.author.equals(user._id) ? post : null;
        }));

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilepicture: user.profilepicture,
            bio: user.bio,
            followers: [...new Set((user.followers || []).map(id => id.toString()))],
            following: [...new Set((user.following || []).map(id => id.toString()))],
            posts: populatedPost,
            bookmarks: user.bookmarks,
        };

        // 4. Send cookie
        res.cookie("token", jwtToken, {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60 * 1000,
        })
            .status(200)
            .json({
                message: `${user.username} logged in with Google`,
                success: true,
                user,
            });
    } catch (error) {
        console.error("Google login error Details:", error.message);
        res.status(401).json({ message: "Google login failed: " + error.message, success: false });
    }

};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required", success: false });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User with this email does not exist", success: false });
        }

        // Generate Reset Token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        // 🛡️ SECURITY PROTOCOL: In a real enterprise app, we would email this link.
        // For this demo/portfolio, we'll return it in the response so the user can "recover" it.
        console.log(`[RECOVERY] Reset Token for ${email}: ${resetToken}`);

        return res.status(200).json({ 
            message: "Recovery token generated successfully. (Check server logs in real apps)", 
            token: resetToken, 
            success: true 
        });
    } catch (error) {
        console.error("[Forgot Password Error]", error);
        res.status(500).json({ message: "Server error during recovery", success: false });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: "Token and New Password are required", success: false });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Recovery token is invalid or has expired", success: false });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        return res.status(200).json({ message: "Access Key updated successfully! You can now login.", success: true });
    } catch (error) {
        console.error("[Reset Password Error]", error);
        res.status(500).json({ message: "Server error during password reset", success: false });
    }
};

export const sendConnectionRequest = async (req, res) => {
    try {
        const sender = req.id;
        const receiver = req.params.id;

        if (sender === receiver) {
            return res.status(400).json({ message: "You cannot sync with yourself", success: false });
        }

        // Check if already connected (mutual follow)
        const currentUser = await User.findById(sender);
        if (currentUser.following.includes(receiver)) {
            return res.status(400).json({ message: "Network already synchronized", success: false });
        }

        // Check for existing pending request
        const existingRequest = await ConnectionRequest.findOne({
            $or: [
                { sender, receiver, status: "pending" },
                { sender: receiver, receiver: sender, status: "pending" }
            ]
        });

        if (existingRequest) {
            return res.status(400).json({ message: "Synergy request already pending", success: false });
        }

        const newRequest = await ConnectionRequest.create({ sender, receiver });

        // Notify receiver
        const senderUser = await User.findById(sender).select('username profilepicture');
        
        await Notification.create({
            recipient: receiver,
            sender,
            type: 'connectionRequest',
            message: `${senderUser.username} requested profile synergy`
        });

        const notification = {
            type: 'connectionRequest',
            userId: sender,
            userDetails: senderUser,
            message: `${senderUser.username} requested profile synergy`,
        }
        const targetSocketId = getReciverId(receiver);
        if (targetSocketId) {
            io.to(targetSocketId).emit("notification", notification);
        }

        return res.status(200).json({ message: "Synergy request sent successfully", success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}

export const acceptConnectionRequest = async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const receiver = req.id;

        const request = await ConnectionRequest.findById(requestId);
        if (!request || request.receiver.toString() !== receiver || request.status !== "pending") {
            return res.status(404).json({ message: "Synergy request not found or unauthorized", success: false });
        }

        const sender = request.sender;

        // Auto-follow BOTH ways
        await Promise.all([
            User.updateOne({ _id: sender }, { $addToSet: { following: receiver, followers: receiver } }),
            User.updateOne({ _id: receiver }, { $addToSet: { following: sender, followers: sender } }),
            ConnectionRequest.updateOne({ _id: requestId }, { status: "accepted" }),
            Notification.deleteOne({ recipient: receiver, sender: sender, type: 'connectionRequest' })
        ]);

        // Fetch fresh populated users to return to acceptor
        const senderUser = await User.findById(sender).select('-password').populate('followers following');
        const receiverUser = await User.findById(receiver).select('-password').populate('followers following');

        await Notification.create({
            recipient: sender,
            sender: receiver,
            type: 'connectionAccepted',
            message: `${receiverUser.username} accepted your synergy request. Real-time DMs active.`
        });

        // Notify sender as before
        const notification = {
            type: 'connectionAccepted',
            userId: receiver,
            userDetails: receiverUser,
            message: `${receiverUser.username} accepted your synergy request. Real-time DMs active.`,
        }
        const targetSocketId = getReciverId(sender);
        if (targetSocketId) {
            io.to(targetSocketId).emit("notification", notification);
        }

        return res.status(200).json({ 
            message: "Network synchronized successfully", 
            success: true,
            sender: senderUser,
            receiver: receiverUser
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}

export const rejectConnectionRequest = async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const receiver = req.id;

        const request = await ConnectionRequest.findById(requestId);
        if (!request || request.receiver.toString() !== receiver) {
            return res.status(404).json({ message: "Synergy request not found or unauthorized", success: false });
        }

        await Promise.all([
            ConnectionRequest.deleteOne({ _id: requestId }),
            Notification.deleteOne({ recipient: receiver, sender: request.sender, type: 'connectionRequest' })
        ]);

        return res.status(200).json({ message: "Synergy request declined", success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}

export const getPendingRequests = async (req, res) => {
    try {
        const requests = await ConnectionRequest.find({
            receiver: req.id,
            status: "pending"
        }).populate("sender", "username profilepicture bio");

        return res.status(200).json({ requests, success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}

export const getConnectionStatus = async (req, res) => {
    try {
        const sender = req.id;
        const receiver = req.params.id;

        const request = await ConnectionRequest.findOne({
            $or: [
                { sender, receiver },
                { sender: receiver, receiver: sender }
            ]
        });

        return res.status(200).json({ status: request?.status || "none", request, success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}
export const withdrawConnectionRequest = async (req, res) => {
    try {
        const sender = req.id;
        const receiver = req.params.id;

        const request = await ConnectionRequest.findOne({
            sender,
            receiver,
            status: "pending"
        });

        if (!request) {
            return res.status(404).json({ message: "No pending synergy request found to withdraw", success: false });
        }

        await Promise.all([
            ConnectionRequest.deleteOne({ _id: request._id }),
            Notification.deleteOne({ recipient: receiver, sender, type: 'connectionRequest' })
        ]);

        // Socket notification for withdrawal
        const receiverSocketId = getReciverId(receiver);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("notification", {
                type: 'connectionWithdrawn',
                userId: sender,
            });
        }

        return res.status(200).json({ message: "Synergy request withdrawn successfully", success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}
export const removeSynergy = async (req, res) => {
    try {
        const userId = req.id;
        const targetId = req.params.id;

        // 1. Remove mutual follows
        await Promise.all([
            User.updateOne({ _id: userId }, { $pull: { following: targetId, followers: targetId } }),
            User.updateOne({ _id: targetId }, { $pull: { following: userId, followers: userId } }),
            ConnectionRequest.deleteMany({
                $or: [
                    { sender: userId, receiver: targetId },
                    { sender: targetId, receiver: userId }
                ]
            }),
            Notification.deleteMany({
                $or: [
                    { recipient: userId, sender: targetId, type: { $in: ['connectionRequest', 'connectionAccepted'] } },
                    { recipient: targetId, sender: userId, type: { $in: ['connectionRequest', 'connectionAccepted'] } }
                ]
            })
        ]);
        
        // Notify other user
        const targetSocketId = getReciverId(targetId);
        if (targetSocketId) {
            io.to(targetSocketId).emit("notification", {
                type: 'connectionRemoved',
                userId,
            });
        }

        return res.status(200).json({ message: "Synergy terminated successfully", success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}

export const getMe = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId).select("-password").populate('followers following');
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        const userObj = user.toObject();
        userObj.followers = [...new Set((userObj.followers || []).map(id => id._id ? id._id.toString() : id.toString()))];
        userObj.following = [...new Set((userObj.following || []).map(id => id._id ? id._id.toString() : id.toString()))];

        return res.status(200).json({ user: userObj, success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
};

/**
/**
 * 🔍 Recruiter Search Portal ("Zocial Scout")
 * Enables recruiters to search candidates using true AI Semantic Search
 * against candidate skills, bio, role, and visual proof-of-work transmissions.
 */
export const scoutCandidates = async (req, res) => {
    try {
        const { skills, role, openOnly, query, jd } = { ...req.query, ...req.body };

        const isSearching = Boolean(
            (skills && skills.trim()) || 
            (role && role.trim()) || 
            (query && query.trim()) ||
            (jd && jd.trim())
        );
        const isJDMatch = Boolean(jd && jd.trim());

        const filter = {};
        if (req.id) {
            filter._id = { $ne: req.id };
        }
        if (String(openOnly) === "true") {
            filter.openToOpportunities = true;
        }

        // Fetch candidates with their transmissions and resume data
        let candidates = await User.find(filter)
            .select("-password")
            .populate({
                path: "posts",
                options: { sort: { createdAt: -1 }, limit: 6 },
                select: "caption image githubUrl liveUrl tags isBounty bountyAmount createdAt"
            });

        // 1. Browsing State (No query entered): Do NOT assign arbitrary 85% match!
        if (!isSearching) {
            const formattedCandidates = candidates.map(candidate => ({
                _id: candidate._id,
                username: candidate.username,
                profilepicture: candidate.profilepicture,
                bio: candidate.bio,
                targetRole: candidate.targetRole || "Software Builder",
                hourlyRate: candidate.hourlyRate || "Flexible",
                openToOpportunities: candidate.openToOpportunities,
                githubProfile: candidate.githubProfile,
                portfolioUrl: candidate.portfolioUrl,
                skills: candidate.skills || [],
                matchedSkills: [],
                matchScore: null, // Null when not searching!
                semanticReason: null,
                proofOfWorkCount: candidate.posts?.length || 0,
                transmissions: candidate.posts || []
            }));

            // Sort active builders first by verified proof-of-work count
            formattedCandidates.sort((a, b) => b.proofOfWorkCount - a.proofOfWorkCount);

            return res.status(200).json({
                success: true,
                isSearching: false,
                isJDMatch: false,
                total: formattedCandidates.length,
                candidates: formattedCandidates
            });
        }

        // 2. Search State: Perform Real AI Semantic Match / ATS JD Match
        const semanticQuery = [
            jd ? `JOB DESCRIPTION (JD):\n"""${jd.trim()}"""` : '',
            query ? `Search Query: "${query.trim()}"` : '',
            role ? `Target Role/Specialization: "${role.trim()}"` : '',
            skills ? `Required Tech Stack/Skills: "${skills.trim()}"` : ''
        ].filter(Boolean).join("\n\n");

        // Build concise candidate profiles for semantic evaluation
        const candidateProfiles = candidates.map((c) => ({
            id: c._id.toString(),
            username: c.username,
            targetRole: c.targetRole || "Software Builder",
            bio: c.bio || "",
            skills: c.skills || [],
            resumeSummary: c.resume_data?.ai_summary || c.ai_summary || "",
            transmissions: (c.posts || []).slice(0, 3).map(p => ({
                caption: (p.caption || "").substring(0, 100),
                tags: p.tags || []
            }))
        }));

        let semanticScoreMap = {};
        try {
            const prompt = `You are an elite Principal AI Technical Recruiter and ATS (Applicant Tracking System) Evaluation Engine.
Evaluate each candidate builder semantically against the following Job Description (JD) and search requirements:

TARGET REQUIREMENTS / JOB DESCRIPTION:
${semanticQuery}

CANDIDATES:
${JSON.stringify(candidateProfiles, null, 2)}

Instructions:
Perform true ATS semantic scoring:
1. Compare candidate's proven skills, target role, bio, resume summary, and verified proof-of-work project transmissions against the requirements in the JD.
2. Assign an ATS Match Score (10 to 99):
   - 88-99%: Top-tier match with key technologies, architecture, and senior scope.
   - 70-87%: Solid relevant match with core technologies or strong transferable builder experience.
   - 45-69%: Partial match or foundational overlap.
   - 10-44%: Minimal or distant alignment.
3. Identify exact "matchedSkills" found in the JD that the candidate possesses.
4. Provide a punchy 1-sentence "semanticReason" (e.g. "Direct match with React, Node.js, and cloud microservices required in JD").

Return strict valid JSON with an array named "results":
{
  "results": [
    {
      "id": "candidate_id",
      "matchScore": number,
      "semanticReason": "Short 1-sentence explanation of why they match or align",
      "matchedSkills": ["skill1", "skill2"]
    }
  ]
}`;

            const { data } = await generateJsonWithGemini(
                prompt,
                "You are an ATS semantic talent matcher. Always return strict, valid JSON with a 'results' array."
            );

            if (data && Array.isArray(data.results)) {
                data.results.forEach(item => {
                    if (item.id) {
                        semanticScoreMap[item.id] = {
                            matchScore: Math.min(99, Math.max(10, Math.round(Number(item.matchScore) || 50))),
                            semanticReason: item.semanticReason || "",
                            matchedSkills: Array.isArray(item.matchedSkills) ? item.matchedSkills : []
                        };
                    }
                });
            }
        } catch (geminiError) {
            console.error("[Scout Semantic Gemini Fallback]", geminiError);
        }

        // Combine semantic results with candidate records (with fallback heuristics if needed)
        const scoredCandidates = candidates.map(candidate => {
            const idStr = candidate._id.toString();
            const semanticResult = semanticScoreMap[idStr];

            let matchScore;
            let semanticReason = "";
            let matchedSkills = [];

            if (semanticResult) {
                matchScore = semanticResult.matchScore;
                semanticReason = semanticResult.semanticReason;
                matchedSkills = semanticResult.matchedSkills;
            } else {
                // Heuristic Fallback
                const queryTokens = (semanticQuery.toLowerCase().match(/\b[a-z0-9+#.-]{2,}\b/g) || []);
                const candidateText = [
                    candidate.username,
                    candidate.targetRole,
                    candidate.bio,
                    ...(candidate.skills || []),
                    ...((candidate.posts || []).flatMap(p => p.tags || []))
                ].join(" ").toLowerCase();

                const hits = queryTokens.filter(t => candidateText.includes(t));
                matchScore = queryTokens.length > 0 
                    ? Math.min(95, Math.max(20, Math.round((hits.length / queryTokens.length) * 100))) 
                    : 60;
                matchedSkills = hits.slice(0, 4);
                semanticReason = hits.length > 0 ? `Demonstrated capabilities in ${hits.slice(0, 3).join(", ")}` : "Verified network builder";
            }

            return {
                _id: candidate._id,
                username: candidate.username,
                profilepicture: candidate.profilepicture,
                bio: candidate.bio,
                targetRole: candidate.targetRole || "Software Builder",
                hourlyRate: candidate.hourlyRate || "Flexible",
                openToOpportunities: candidate.openToOpportunities,
                githubProfile: candidate.githubProfile,
                portfolioUrl: candidate.portfolioUrl,
                skills: candidate.skills || [],
                matchedSkills,
                matchScore,
                semanticReason,
                proofOfWorkCount: candidate.posts?.length || 0,
                transmissions: candidate.posts || []
            };
        });

        // Sort strictly by highest ATS match score first
        const relevantCandidates = scoredCandidates
            .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        return res.status(200).json({
            success: true,
            isSearching: true,
            isJDMatch,
            total: relevantCandidates.length,
            candidates: relevantCandidates
        });
    } catch (error) {
        console.error("[Zocial Scout Error]", error);
        return res.status(500).json({ message: "Server error querying candidates", success: false });
    }
};

/**
 * 🔍 User Search & Collaborator Autocomplete
 * Finds connected synergy partners and network builders for collaborator tagging.
 */
export const searchUsers = async (req, res) => {
    try {
        const query = (req.query.q || req.query.query || "").trim();
        const currentUserId = req.id;

        // If query is empty, return the user's connected synergy partners (following)
        if (!query) {
            const currentUser = await User.findById(currentUserId).populate({
                path: "following",
                select: "username profilepicture bio targetRole skills"
            });
            return res.status(200).json({
                success: true,
                users: currentUser?.following?.slice(0, 15) || []
            });
        }

        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safeQuery, 'i');

        const users = await User.find({
            _id: { $ne: currentUserId },
            $or: [
                { username: regex },
                { targetRole: regex },
                { skills: regex }
            ]
        })
        .select("username profilepicture bio targetRole skills")
        .limit(10);

        return res.status(200).json({
            success: true,
            users
        });
    } catch (error) {
        console.error("[Search Users Error]", error);
        return res.status(500).json({ message: "Server error searching users", success: false });
    }
};
