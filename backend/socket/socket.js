import { Server } from "socket.io";
import express from "express";
import http from "http";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { ConnectionRequest } from "../models/connectionRequest.model.js";

const app = express();
const server = http.createServer(app);

const rawClientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/+$/, "") : "";
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    rawClientUrl
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Socket CORS rejected"));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    },
});

// Map prevents object prototype pollution
const userSocketMap = new Map();

export const getReciverId = (receiverId) => {
    if (!receiverId) return null;
    return userSocketMap.get(receiverId.toString());
};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  
  if (userId && typeof userId === "string") {
    userSocketMap.set(userId, socket.id);
  }
  
  io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

  socket.on("disconnect", () => {
    if (userId) {
      userSocketMap.delete(userId);
    }
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
  });

  // Video offer
  socket.on("video-offer", async ({ to, offer, userDetails }) => {
    try {
      if (!userId || !to) return;

      // Ensure caller and recipient are connected
      const [callerUser, receiverUser] = await Promise.all([
        User.findById(userId).select("following"),
        User.findById(to).select("following")
      ]);

      const isMutualFollow =
        callerUser?.following?.some((id) => id.toString() === to.toString()) &&
        receiverUser?.following?.some((id) => id.toString() === userId.toString());

      let isConnected = Boolean(isMutualFollow);
      if (!isConnected) {
        const accepted = await ConnectionRequest.findOne({
          $or: [
            { sender: userId, receiver: to, status: "accepted" },
            { sender: to, receiver: userId, status: "accepted" }
          ]
        });
        isConnected = Boolean(accepted);
      }

      if (!isConnected) {
        socket.emit("call-error", {
          message: "Video calls are only allowed between connected builders. Establish synergy first!"
        });
        return;
      }

      const receiverSocketId = getReciverId(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("video-offer", {
          from: userId,
          offer,
          userDetails,
        });
      }
    } catch (err) {
      console.error("video-offer authorization error:", err);
    }
  });

  // Video answer
  socket.on("video-answer", ({ to, answer }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("video-answer", {
        from: userId,
        answer,
      });
    }
  });

  // ICE candidate
  socket.on("ice-candidate", ({ to, candidate }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ice-candidate", {
        from: userId,
        candidate,
      });
    }
  });

  // Call rejected
  socket.on("call-rejected", async ({ to }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-rejected", {
        from: userId,
      });
    }
  });

  // Call ended
  socket.on("call-ended", ({ to }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-ended", {
        from: userId,
      });
    }
  });

  // Missed call notification
  socket.on("missed-call", async ({ to }) => {
    try {
      if (!to || !userId || to === userId) return;
      const caller = await User.findById(userId).select("username profilepicture");
      if (caller) {
        const notif = await Notification.create({
          recipient: to,
          sender: userId,
          type: "missedCall",
          message: `Missed video call from @${caller.username}`
        });
        const receiverSocketId = getReciverId(to);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("notification", {
            type: "missedCall",
            userId,
            userDetails: caller,
            message: `Missed video call from @${caller.username}`,
            createdAt: notif.createdAt,
            timestamp: Date.now()
          });
        }
      }
    } catch (e) {
      console.error("Socket missed-call error:", e);
    }
  });

  // 💻 Pair Programming Real-Time Code Sync
  socket.on("pair_code_change", ({ to, code, language, cursor }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("pair_code_update", {
        from: userId,
        code,
        language,
        cursor
      });
    }
  });

  // 🎨 Collaborative Whiteboard Canvas Draw Sync
  socket.on("whiteboard_draw", ({ to, drawData }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("whiteboard_draw_update", {
        from: userId,
        drawData
      });
    }
  });

  socket.on("whiteboard_clear", ({ to }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("whiteboard_cleared", {
        from: userId
      });
    }
  });
});

export { app, server, io };