const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // May be null for unauthenticated actions
  action: { type: String, required: true }, // e.g. LOGIN, LOGOUT, LESSON_COMPLETED, SESSION_COMPLETED, UPDATE_PROFILE
  details: { type: Object, default: {} }, // Arbitrary object for extra info (e.g. lessonId)
  ip: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);