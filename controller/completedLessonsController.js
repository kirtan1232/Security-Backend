const CompletedLessons = require("../model/CompletedLessons");
const { createLog } = require("./auditLogController"); // Import audit log utility

exports.getCompletedLessons = async (req, res) => {
  try {
    const userId = req.user.id;
    const completedLessons = await CompletedLessons.findOne({ userId });

    if (!completedLessons) {
      return res.status(200).json({ completedLessons: [] });
    }

    res.json({ completedLessons: completedLessons.completedLessons });
  } catch (error) {
    console.error("Error fetching completed lessons:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.addCompletedLesson = async (req, res) => {
  const userId = req.user.id;
  const { day, instrument } = req.body;

  if (!day || !instrument) {
    return res.status(400).json({ error: "Day and instrument are required" });
  }

  try {
    let completedLessons = await CompletedLessons.findOne({ userId });
    if (!completedLessons) {
      completedLessons = new CompletedLessons({ userId, completedLessons: [] });
    }

    // Check if the lesson is already completed
    const lessonIndex = completedLessons.completedLessons.findIndex(
      (lesson) => lesson.day === day && lesson.instrument === instrument
    );

    let logAction;
    if (lessonIndex !== -1) {
      // Update existing completion with a new timestamp
      completedLessons.completedLessons[lessonIndex].completedAt = new Date();
      logAction = "LESSON_COMPLETION_UPDATED";
    } else {
      // Add new completion
      completedLessons.completedLessons.push({ day, instrument, completedAt: new Date() });
      logAction = "LESSON_COMPLETED";
    }

    await completedLessons.save();

    // --- AUDIT LOG ---
    await createLog({
      user: userId,
      action: logAction,
      details: { day, instrument },
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.status(200).json({
      message: lessonIndex !== -1 ? "Lesson completion updated" : "Lesson marked as completed",
      completedLessons: completedLessons.completedLessons,
    });
  } catch (error) {
    console.error("Error adding completed lesson:", error);
    res.status(500).json({ error: "Failed to mark lesson as completed", error: error.message });
  }
};