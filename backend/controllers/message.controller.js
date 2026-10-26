import mongoose from "mongoose";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { getReciverId, io } from "../socket/socket.js";

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const { message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid recipient ID", success: false });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message content cannot be empty", success: false });
    }

    const sanitizedMessage = message.trim().substring(0, 2000);

    // 🔒 Security: Check for mutual follow before allowing message transmission
    const [sender, receiver] = await Promise.all([
      User.findById(senderId).select("following"),
      User.findById(receiverId).select("following")
    ]);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    const isMutual = sender.following.includes(receiverId) && receiver.following.includes(senderId);

    if (!isMutual) {
      return res.status(403).json({
        message: "Mutual follow (verified link) required to initiate secure transmission.",
        success: false
      });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId]
      });
    }

    let newMessage = await Message.create({ senderId, receiverId, message: sanitizedMessage });

    if (newMessage) {
      conversation.messages.push(newMessage._id);
    }

    await conversation.save();

    newMessage = await newMessage.populate([
      { path: "senderId", select: "username profilepicture" },
      { path: "receiverId", select: "username profilepicture" }
    ]);

    // Real-time socket.io
    const receiverSocketId = getReciverId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message", newMessage);
    }

    return res.status(200).json({
      message: "Message sent successfully",
      success: true,
      newMessage
    });
  } catch (error) {
    console.error("[Send Message Error]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid recipient ID", success: false });
    }

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    }).populate({
      path: "messages",
      populate: [
        { path: "senderId", select: "username profilepicture" },
        { path: "receiverId", select: "username profilepicture" }
      ],
      options: { sort: { createdAt: 1 } }
    });

    if (!conversation) {
      return res.status(200).json({ messages: [], success: true });
    }

    return res.status(200).json({
      messages: conversation?.messages || [],
      success: true
    });
  } catch (error) {
    console.error("[Get Messages Error]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
