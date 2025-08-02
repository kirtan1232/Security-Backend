const express = require("express");
const router = express.Router();
const uploadMiddleware = require("../middleware/quizmulter");
const quizController = require("../controller/quizController"); 

router.post("/addquiz", uploadMiddleware, quizController.createQuiz);
router.get("/getquiz", quizController.getQuizzesByDayAndInstrument);
router.get("/getAllQuizzes", quizController.getAllQuizzes);
router.put("/updatequiz/:quizId", uploadMiddleware, quizController.updateQuiz);
router.delete("/deletequiz/:quizId", quizController.deleteQuiz);

module.exports = router;