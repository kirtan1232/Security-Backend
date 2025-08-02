const AuditLog = require('../model/AuditLog');

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
    
    console.error('Failed to write audit log:', err.message);
  }
};


exports.getAuditLogs = async (req, res) => {
  try {
    
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