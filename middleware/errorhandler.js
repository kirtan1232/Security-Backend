const multer = require('multer');

function errorHandler(err, req, res, next) {
 
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
  
    res.status(500).json({ message: err.message || "An unexpected error occurred." });
}

module.exports = errorHandler;