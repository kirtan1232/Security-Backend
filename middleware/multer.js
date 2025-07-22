const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Store files in the Uploads folder
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// File filter to allow only images (jpg, jpeg, png) and DOCX files
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const allowedDocTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (allowedImageTypes.includes(file.mimetype) || allowedDocTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and DOCX files are allowed.'), false);
    }
};

// Configure multer with storage, file filter, and limits
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 10 // Maximum 10 files (combined images and DOCX)
    }
});

// Middleware to handle multiple images and DOCX files
const uploadMiddleware = upload.fields([
    { name: 'chordDiagrams', maxCount: 10 }, // Allow up to 5 images for chord diagrams
    { name: 'docxFiles', maxCount: 10} // Allow up to 5 DOCX files
]);

module.exports = uploadMiddleware;