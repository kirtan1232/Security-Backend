const CompletedSessions = require("../model/CompletedSessions");
const { createLog } = require("./auditLogController"); 

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

    const isCompleted = completedSessions.completedSessions.some(
      (s) => s.day === day && s.instrument === instrument
    );

    let logAction;
    if (isCompleted) {
      // Remove completion
      completedSessions.completedSessions = completedSessions.completedSessions.filter(
        (s) => !(s.day === day && s.instrument === instrument)
      );
      logAction = "SESSION_COMPLETION_REMOVED";
    } else {
      // Add completion
      completedSessions.completedSessions.push({ day, instrument });
      logAction = "SESSION_COMPLETED";
    }

    await completedSessions.save();

    // --- AUDIT LOG ---
    await createLog({
      user: userId,
      action: logAction,
      details: { day, instrument },
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.status(200).json({
      message: "Session completion toggled successfully",
      completedSessions: completedSessions.completedSessions,
    });
  } catch (error) {
    console.error("Error toggling session completion:", error);
    res.status(500).json({ error: "Failed to toggle session completion", error: error.message });
  }
};