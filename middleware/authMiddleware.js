const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    let token = null;
   
    if (req.cookies && req.cookies.authToken) {
        token = req.cookies.authToken;
    }
  
    if (!token && req.header('Authorization') && req.header('Authorization').startsWith('Bearer ')) {
        token = req.header('Authorization').split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'Access Denied: No token provided' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid Token' });
    }
};

const authorizeRole = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to specific roles' });
    }
    next();
};

module.exports = { verifyToken, authorizeRole };