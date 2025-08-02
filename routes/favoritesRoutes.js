const express = require('express');
const router = express.Router();
const favoritesController = require('../controller/favoritesController'); 
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/getfav', verifyToken, favoritesController.getFavorites); 
router.post('/songs', verifyToken, favoritesController.toggleFavoriteSong); 
module.exports = router;
