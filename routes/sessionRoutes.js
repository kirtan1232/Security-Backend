const express = require('express');
const uploadMiddleware = require("../middleware/uploadMiddleware");
const sessionController = require('../controller/sessionController');
const router = express.Router();

// Route to create a new session
router.post('/', uploadMiddleware, sessionController.createSession);

// Route to update a session
router.put('/:id', uploadMiddleware, sessionController.updateSession);

// Route to delete a session
router.delete('/:id', sessionController.deleteSession);

// Route to get all sessions
router.get('/', sessionController.getAllSessions);

module.exports = router;