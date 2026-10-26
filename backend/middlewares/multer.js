import multer from "multer";

/**
 * 🔒 Hardened Multer Configuration
 * - Enforces memory buffer limits (Max 10MB) to prevent Heap Out-Of-Memory attacks
 * - Strict MIME-type allowlist restricting uploads to valid image formats
 */
const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB hard limit
        files: 1 // Single file per request
    },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are permitted."), false);
        }
    }
});

export default upload;