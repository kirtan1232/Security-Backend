const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    instrument: {
        type: String,
        enum: ['Guitar', 'Piano', 'Ukulele'],
        required: true
    },
    day: {
        type: String,
        enum: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true,
        min: [1, 'Duration must be greater than 0']
    },
    instructions: {
        type: String,
        required: true
    },
    file: {
        type: String, // Store file URL (after upload to a storage server like AWS S3 or local)
        default: null
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
