const express = require("express");
const cors = require("cors");
const connectDb = require("./config/db");
const AuthRouter = require("./routes/authRoutes");
const protectedRouter = require("./routes/protectedRoutes");
const songRoutes = require("./routes/songRoutes");
const sessionRoutes = require('./routes/sessionRoutes');
const quizRoutes = require('./routes/quizRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const completedLessonsRoutes = require('./routes/completedLessonsRoutes');
const completedSessionsRoutes = require('./routes/completedSessionsRoutes');
const esewaRoutes = require('./routes/esewaRoutes');
const supportRoutes = require('./routes/supportRoutes');
const songRequestRoutes = require('./routes/songRequestRoutes');
const path = require("path");
const https = require("https");
const fs = require("fs");
const app = express();
const errorHandler = require('./middleware/errorhandler');
const auditLogRoutes = require('./routes/auditLogRoutes');
const cookieParser = require('cookie-parser');
const xss = require('xss-clean');
const crypto = require('crypto');
const mongoSanitize = require('express-mongo-sanitize'); 

require('dotenv').config();
connectDb();

app.use(cors({
    origin: 'https://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(xss());
app.use(mongoSanitize());


app.get('/api/csrf-token', (req, res) => {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 
    });
    res.json({ csrfToken });
});

app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const csrfToken = req.headers['x-csrf-token'];
        const cookieCsrfToken = req.cookies.csrfToken;
        if (!csrfToken || csrfToken !== cookieCsrfToken) {
            return res.status(403).json({ message: 'Invalid CSRF token' });
        }
    }
    next();
});

app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

app.use("/api/auth", AuthRouter);
app.use("/api/protected", protectedRouter);
app.use("/api/songs", songRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/completed', completedLessonsRoutes);
app.use('/api/completed-sessions', completedSessionsRoutes);
app.use('/api/esewa', esewaRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/song-requests', songRequestRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

const port = 3000;

const options = {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem'),
};

https.createServer(options, app).listen(port, '0.0.0.0', () => {
  
});