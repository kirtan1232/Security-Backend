const express = require('express');
const router = express.Router();
const auditLogController = require('../controller/auditLogController');
const authMiddleware = require('../middleware/auth'); // Ensure this checks JWT and sets req.user

// Only admin can view logs
router.get('/', authMiddleware, auditLogController.getAuditLogs);

module.exports = router;