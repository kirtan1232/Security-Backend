const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  nameOrSocial: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    trim: true,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Support", supportSchema);