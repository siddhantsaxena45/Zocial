import { Server } from "socket.io";
import express from "express";
import http from "http";

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
  socket.on("video-offer", ({ to, offer }) => {
    const receiverSocketId = getReciverId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("video-offer", {
        from: userId,
        offer,
      });
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
  socket.on("call-rejected", ({ to }) => {
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
});

export { app, server, io };