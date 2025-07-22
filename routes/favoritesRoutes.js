const express = require('express');
const router = express.Router();
const favoritesController = require('../controller/favoritesController'); // Adjust the path as necessary
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/getfav', verifyToken, favoritesController.getFavorites); // Get favorites
router.post('/songs', verifyToken, favoritesController.toggleFavoriteSong); // Add/remove song favorite
module.exports = router;
