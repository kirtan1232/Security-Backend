const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
    songName: String,
    selectedInstrument: String,
    lyrics: [{
        section: String,
        lyrics: String,
        parsedDocxFile: [String],  // Array of strings for each lyric's parsed DOCX content
    }],
    chordDiagrams: [String],
    docxFiles: [String],
},{ timestamps: true });

const Song = mongoose.model("Song", songSchema);

// Correct export statement
module.exports = Song;
