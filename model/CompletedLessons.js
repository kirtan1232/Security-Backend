const mongoose = require("mongoose");

const CompletedLessonsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  completedLessons: [
    {
      day: { type: String, required: true },
      instrument: { type: String, required: true },
      completedAt: { type: Date, default: Date.now }, // Added field
    },
  ],
});

module.exports = mongoose.model("CompletedLessons", CompletedLessonsSchema);