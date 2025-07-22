const jwt = require('jsonwebtoken');

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access Denied: No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Remove "Bearer " prefix

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
        req.user = verified; // Attach user info to request object
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid Token' });
    }
};


// Middleware to authorize roles
const authorizeRole = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to specific roles' });
    }
    next();
};

module.exports = { verifyToken, authorizeRole };
