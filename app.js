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
const https = require("https"); // Add HTTPS module
const fs = require("fs"); // Add FS module to read certificates
const app = express();
const errorHandler = require('./middleware/errorhandler');
const auditLogRoutes = require('./routes/auditLogRoutes'); // Import AuditLog model
require('dotenv').config();
// Connect to MongoDB
connectDb();

// CORS configuration
app.use(cors({
    origin: 'https://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser middleware
app.use(express.json());


// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Routes
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

// Handle 404
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

const port = 3000;

// Create HTTPS server
const options = {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem'),
};

https.createServer(options, app).listen(port, () => {
    console.log(`Server running at https://localhost:${port}`);
});