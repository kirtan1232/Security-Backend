const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    day: { type: String, required: true },
    instrument: { type: String, required: true }, 
    quizzes: [
        {
            question: { type: String, required: true },
            options: { type: [String], required: true },
            correctAnswer: { type: String, required: true },
            chordDiagram: { type: String, required: false }, 
        },
    ],
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
