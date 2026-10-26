import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { getReciverId, io } from "../socket/socket.js";

export const getNotifications = async (req, res) => {
    try {
        const userId = req.id;
        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .populate('sender', 'username profilepicture');

        return res.status(200).json({ notifications, success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}

export const markAsRead = async (req, res) => {
    try {
        const userId = req.id;
        await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });

        return res.status(200).json({ message: "Notifications marked as read", success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
}

export const createMissedCallNotification = async (req, res) => {
    try {
        const callerId = req.id;
        const receiverId = req.params.id;

        if (!receiverId || callerId === receiverId) {
            return res.status(400).json({ message: "Invalid recipient", success: false });
        }

        const caller = await User.findById(callerId).select("username profilepicture");
        if (!caller) {
            return res.status(404).json({ message: "Caller not found", success: false });
        }

        const newNotification = await Notification.create({
            recipient: receiverId,
            sender: callerId,
            type: "missedCall",
            message: `Missed video call from @${caller.username}`
        });

        const receiverSocketId = getReciverId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("notification", {
                type: "missedCall",
                userId: callerId,
                userDetails: caller,
                message: `Missed video call from @${caller.username}`,
                createdAt: newNotification.createdAt,
                timestamp: Date.now()
            });
        }

        return res.status(200).json({ 
            message: "Missed call notification registered", 
            success: true, 
            notification: newNotification 
        });
    } catch (error) {
        console.error("Error creating missed call notification:", error);
        return res.status(500).json({ message: "Server error", success: false });
    }
};
