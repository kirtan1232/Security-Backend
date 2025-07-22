const CompletedSessions = require("../model/CompletedSessions");

exports.getCompletedSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const completedSessions = await CompletedSessions.findOne({ userId });

    if (!completedSessions) {
      return res.status(200).json({ completedSessions: [] });
    }

    res.json({ completedSessions: completedSessions.completedSessions });
  } catch (error) {
    console.error("Error fetching completed sessions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.toggleCompletedSession = async (req, res) => {
  const userId = req.user.id;
  const { day, instrument } = req.body;

  if (!day || !instrument) {
    return res.status(400).json({ error: "Day and instrument are required" });
  }

  try {
    let completedSessions = await CompletedSessions.findOne({ userId });
    if (!completedSessions) {
      completedSessions = new CompletedSessions({ userId, completedSessions: [] });
    }

    const sessionKey = { day, instrument };
    const isCompleted = completedSessions.completedSessions.some(
      (s) => s.day === day && s.instrument === instrument
    );

    if (isCompleted) {
      // Remove completion
      completedSessions.completedSessions = completedSessions.completedSessions.filter(
        (s) => !(s.day === day && s.instrument === instrument)
      );
    } else {
      // Add completion
      completedSessions.completedSessions.push(sessionKey);
    }

    await completedSessions.save();
    res.status(200).json({
      message: "Session completion toggled successfully",
      completedSessions: completedSessions.completedSessions,
    });
  } catch (error) {
    console.error("Error toggling session completion:", error);
    res.status(500).json({ error: "Failed to toggle session completion", error: error.message });
  }
};