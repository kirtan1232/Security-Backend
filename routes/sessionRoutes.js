const express = require('express');
const uploadMiddleware = require("../middleware/uploadMiddleware");
const sessionController = require('../controller/sessionController');
const router = express.Router();


router.post('/', uploadMiddleware, sessionController.createSession);

router.put('/:id', uploadMiddleware, sessionController.updateSession);


router.delete('/:id', sessionController.deleteSession);


router.get('/', sessionController.getAllSessions);

module.exports = router;