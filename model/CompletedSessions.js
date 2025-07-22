const mongoose = require("mongoose");

const completedSessionsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    completedSessions: [
      {
        day: { type: String, required: true },
        instrument: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

const CompletedSessions = mongoose.model("CompletedSessions", completedSessionsSchema);
module.exports = CompletedSessions;