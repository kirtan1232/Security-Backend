const multer = require("multer");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "." + file.originalname.split(".").pop());
    },
});

const upload = multer({
    storage
}).fields([
    { name: "chordDiagrams", maxCount: 5 },
    { name: "docxFiles", maxCount: 10 },

]);

module.exports = upload;