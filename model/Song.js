const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
    songName: String,
    selectedInstrument: String,
    lyrics: [{
        section: String,
        lyrics: String,
        parsedDocxFile: [String],  
    }],
    chordDiagrams: [String],
    docxFiles: [String],
},{ timestamps: true });

const Song = mongoose.model("Song", songSchema);


module.exports = Song;
