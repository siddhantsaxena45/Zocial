import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";
import resumeRoute from "./routes/resume.route.js";
import notificationRoute from "./routes/notification.route.js";
import { app, server } from "./socket/socket.js";

dotenv.config({});
const port = process.env.PORT || 8000;

// 🔒 1. Express Security Hardening & Headers
app.set("trust proxy", 1); // Enable proxy trusting for Render/Vercel reverse proxies
app.disable("x-powered-by");

app.use(helmet({
    contentSecurityPolicy: false, // Managed by frontend hosting
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
}));

// 🔒 2. CORS Allowlist
const rawClientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/+$/, "") : "";
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    rawClientUrl
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or in allowlist
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS Blocked] Origin: ${origin}`);
            callback(new Error("CORS policy violation: Access from this origin is not allowed."));
        }
    },
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true
};

app.use(cors(corsOptions));

// 🔒 3. Rate Limiting Protection
// General API Rate Limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // limit each IP to 300 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: { success: false, message: "Too many requests from this IP, please try again after 15 minutes." }
});
app.use("/api/v1/", generalLimiter);

// Auth Rate Limiter (Brute-force protection for login/signup/reset)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: { success: false, message: "Too many authentication attempts. Please try again after 15 minutes." }
});
app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/user/register", authLimiter);
app.use("/api/v1/user/forgot-password", authLimiter);

// AI Resume Rate Limiter (Protection for Gemini API quota)
const resumeLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // 10 generations per window
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: { success: false, message: "AI resume generation limit reached. Please wait a few minutes before regenerating." }
});
app.use("/api/v1/resume/generate", resumeLimiter);
app.use("/api/v1/resume/job-fit", resumeLimiter);

// 🔒 4. Payload Size Limits (Mitigate Heap DoS)
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// 🔒 5. API Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/message", messageRoute);
app.use("/api/v1/resume", resumeRoute);
app.use("/api/v1/notification", notificationRoute);

// Health Check Endpoint
app.get("/api/v1/ping", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 🔒 6. Global Secure Error Handler (No sensitive leakages in production)
app.use((err, req, res, next) => {
    if (err.name === "MulterError") {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ success: false, message: "File exceeds 10MB limit." });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    
    if (err.message && err.message.includes("CORS policy")) {
        return res.status(403).json({ success: false, message: err.message });
    }

    console.error("[Unhandled Server Error]", err);
    const isProd = process.env.NODE_ENV === "production";
    return res.status(err.status || 500).json({
        success: false,
        message: isProd ? "Internal server error occurred." : err.message
    });
});

server.listen(port, () => {
    connectDB();
    console.log(`Server running securely on port ${port}`);
});