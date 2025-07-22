const multer = require('multer');

function errorHandler(err, req, res, next) {
    // Handle Multer-specific errors
    if (err instanceof multer.MulterError || (
        err instanceof Error &&
        (
            err.message.includes('Only JPG') ||
            err.message.includes('Invalid image file type!') ||
            err.message.includes('filename must be safe')
        )
    )) {
        return res.status(400).json({ message: err.message });
    }
    // For other errors, do NOT log to console
    res.status(500).json({ message: err.message || "An unexpected error occurred." });
}

module.exports = errorHandler;