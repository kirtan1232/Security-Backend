const express = require("express");
const router = express.Router();
const completedSessionsController = require("../controller/completedSessionsController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/getcompleted", verifyToken, completedSessionsController.getCompletedSessions);
router.post("/toggle", verifyToken, completedSessionsController.toggleCompletedSession);

module.exports = router;