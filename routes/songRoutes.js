const express = require('express');
const router = express.Router();
const parseDocxText = require('../utils/parseDocxText');
const songController = require('../controller/songController'); 
const uploadMiddleware = require('../middleware/multer');


router.post('/create', uploadMiddleware, songController.createSong);


router.post('/parse-docx', uploadMiddleware, songController.parseDocxFile);

router.get('/getsongs', songController.getAllSongs);


router.get('/:id', songController.getSongById);


router.put('/:id', uploadMiddleware, songController.updateSong);


router.delete('/:id', songController.deleteSong);

module.exports = router;