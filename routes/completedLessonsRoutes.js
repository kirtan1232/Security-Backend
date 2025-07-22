const express = require("express");
const router = express.Router();
const completedLessonsController = require("../controller/completedLessonsController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/getcompleted", verifyToken, completedLessonsController.getCompletedLessons);
router.post("/addcompleted", verifyToken, completedLessonsController.addCompletedLesson);
module.exports = router;