const express = require('express');
const router = express.Router();
const { createSongRequest, getAllSongRequests } = require('../controller/songRequestController');


router.route('/')
  .post(createSongRequest)
  
  .get(getAllSongRequests);

module.exports = router;