const Quiz = require("../model/Quiz");

exports.createQuiz = async (req, res) => {
  try {
    const { quizData } = req.body;
    const parsedQuizData = JSON.parse(quizData);

    
    if (req.files && req.files.length > 0) {
      parsedQuizData.quizzes.forEach((quiz, index) => {
        if (req.files[index]) {
          quiz.chordDiagram = req.files[index].filename;
        } else {
          quiz.chordDiagram = null;
        }
      });
    } else {
      
      parsedQuizData.quizzes.forEach((quiz) => {
        quiz.chordDiagram = null;
      });
    }

    const newQuiz = new Quiz({
      day: parsedQuizData.day,
      instrument: parsedQuizData.instrument,
      quizzes: parsedQuizData.quizzes.map((quiz) => ({
        question: quiz.question,
        options: quiz.options,
        correctAnswer: quiz.correctAnswer,
        chordDiagram: quiz.chordDiagram || null,
      })),
    });

    await newQuiz.save();
    res.status(201).json({ message: "Quiz added successfully!", quizId: newQuiz._id });
  } catch (error) {
    console.error("Error adding quizzes:", error);
    res.status(500).json({ message: "Error adding quizzes. Please try again." });
  }
};

exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find();
    res.status(200).json(quizzes);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({ message: "Error fetching quizzes", error: error.message });
  }
};

exports.getQuizzesByDayAndInstrument = async (req, res) => {
  try {
    const { day, instrument } = req.query;
    const query = {};
    if (day) query.day = day;
    if (instrument) query.instrument = instrument;

    const quizzes = await Quiz.find(query);
    res.status(200).json(quizzes);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({ message: "Error fetching quizzes", error: error.message });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { quizData } = req.body;
    const parsedQuizData = JSON.parse(quizData);

    if (req.files && req.files.length > 0) {
      parsedQuizData.quizzes.forEach((quiz, index) => {
        if (req.files[index]) {
          quiz.chordDiagram = req.files[index].filename;
        } else {
          quiz.chordDiagram = null;
        }
      });
    } else {
   
      parsedQuizData.quizzes.forEach((quiz) => {
        quiz.chordDiagram = quiz.chordDiagram || null;
      });
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      quizId,
      {
        day: parsedQuizData.day,
        instrument: parsedQuizData.instrument,
        quizzes: parsedQuizData.quizzes.map((quiz) => ({
          question: quiz.question,
          options: quiz.options,
          correctAnswer: quiz.correctAnswer,
          chordDiagram: quiz.chordDiagram || null,
        })),
      },
      { new: true }
    );

    if (!updatedQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.status(200).json({ message: "Quiz updated successfully", quiz: updatedQuiz });
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({ message: "Error updating quiz", error: error.message });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const deletedQuiz = await Quiz.findByIdAndDelete(quizId);

    if (!deletedQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ message: "Error deleting quiz", error: error.message });
  }
};