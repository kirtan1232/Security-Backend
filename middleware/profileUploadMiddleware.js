const multer = require("multer");
const path = require("path");

// Allowed extensions and MIME types
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/");
    },
    filename: (req, file, cb) => {
        // Remove dangerous chars, keep only alphanumeric, dash, underscore
        const base = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9-_]/g, "");
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, base + "-" + Date.now() + ext);
    },
});

// Filter for extension, double extension, and mimetype
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Disallow double extension like exploit.php.jpg (anything before .jpg)
    if (!ALLOWED_EXTS.includes(ext) || /\.(php|js|exe|bat|sh)\./i.test(file.originalname)) {
        return cb(new Error("Only JPG, PNG, or WEBP images are allowed and filename must be safe."));
    }
    // Accept only allowed mimetypes
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error("Invalid image file type!"));
    }
    cb(null, true);
};

const profileUpload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
}).single("profilePicture");

module.exports = profileUpload;