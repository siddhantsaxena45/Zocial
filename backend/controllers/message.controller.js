import mongoose from "mongoose";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { ConnectionRequest } from "../models/connectionRequest.model.js";
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

    // 🔒 Security: Check for mutual connection before allowing unlimited messaging
    const [sender, receiver] = await Promise.all([
      User.findById(senderId).select("following"),
      User.findById(receiverId).select("following")
    ]);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    const isMutualFollow =
      sender.following?.some((id) => id.toString() === receiverId.toString()) &&
      receiver.following?.some((id) => id.toString() === senderId.toString());

    let isConnected = Boolean(isMutualFollow);

    if (!isConnected) {
      const acceptedConnection = await ConnectionRequest.findOne({
        $or: [
          { sender: senderId, receiver: receiverId, status: "accepted" },
          { sender: receiverId, receiver: senderId, status: "accepted" }
        ]
      });
      if (acceptedConnection) {
        isConnected = true;
      }
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    // 🔒 One-message rule: Users not connected can send only ONE message until the other person replies or connects
    if (!isConnected && conversation && conversation.messages?.length > 0) {
      const [senderMsgCount, receiverMsgCount] = await Promise.all([
        Message.countDocuments({
          _id: { $in: conversation.messages },
          senderId: senderId
        }),
        Message.countDocuments({
          _id: { $in: conversation.messages },
          senderId: receiverId
        })
      ]);

      if (senderMsgCount >= 1 && receiverMsgCount === 0) {
        return res.status(403).json({
          message: "You can send only one message if not connected. Wait for their reply or connect with them.",
          success: false,
          limitReached: true
        });
      }

      if (senderMsgCount > receiverMsgCount) {
        return res.status(403).json({
          message: "You can send only one message at a time if not connected. Connect with them to chat freely.",
          success: false,
          limitReached: true
        });
      }
    }

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
