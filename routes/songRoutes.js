const express = require('express');
const router = express.Router();
const parseDocxText = require('../utils/parseDocxText');
const songController = require('../controller/songController'); // Corrected path to singular 'controller'
const uploadMiddleware = require('../middleware/multer');

// Route for creating songs
router.post('/create', uploadMiddleware, songController.createSong);

// Route for parsing DOCX files
router.post('/parse-docx', uploadMiddleware, songController.parseDocxFile);

// Route for fetching all songs
router.get('/getsongs', songController.getAllSongs);

// Route for fetching a song by ID
router.get('/:id', songController.getSongById);

// Route for updating a song
router.put('/:id', uploadMiddleware, songController.updateSong);

// Route for deleting a song
router.delete('/:id', songController.deleteSong);

module.exports = router;