const AuditLog = require('../model/AuditLog');

// Create a log entry (for use in other controllers)
exports.createLog = async ({ user, action, details = {}, ip, userAgent }) => {
  try {
    await AuditLog.create({
      user,
      action,
      details,
      ip,
      userAgent
    });
  } catch (err) {
    // Consider logging this error to a separate log file or monitoring system
    console.error('Failed to write audit log:', err.message);
  }
};

// Admin: Get all logs (with filter options)
exports.getAuditLogs = async (req, res) => {
  try {
    // Add RBAC check: only allow admin to access logs
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { user, action, limit = 100, skip = 0 } = req.query;
    const filter = {};
    if (user) filter.user = user;
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .populate('user', 'email name');

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch audit logs', error: err.message });
  }
};