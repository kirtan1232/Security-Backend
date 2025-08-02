const Song = require("../model/Song");
const path = require('path');
const fs = require('fs');
const parseDocxText = require("../utils/parseDocxText");


exports.createSong = async (req, res) => {
    try {
        const { songName, selectedInstrument, lyrics } = req.body;
        let chordDiagrams = [];

       
        let parsedLyrics;
        try {
            parsedLyrics = JSON.parse(lyrics);
        } catch (err) {
            return res.status(400).json({ message: "Invalid lyrics format. Ensure JSON format." });
        }

       
        if (req.files?.chordDiagrams) {
            chordDiagrams = req.files.chordDiagrams.map(file => path.join('uploads', path.basename(file.path)));
        }

       
        let docxText = [];
        let docxFiles = [];
        if (req.files?.docxFiles) {
            docxFiles = req.files.docxFiles.map(file => {
                const newFileName = path.basename(file.filename);
                const newFilePath = path.join('uploads', newFileName);
                
                return newFilePath;
            });

            
            try {
                docxText = await Promise.all(docxFiles.map(async (filePath) => {
                    const parsedDoc = await parseDocxText(filePath);
                    const lyricsText = parsedDoc.map(item => item.lyrics).join('\n');
                    return lyricsText;
                }));
            } catch (error) {
                console.error("Error parsing DOCX files:", error);
                return res.status(500).json({ message: "Error parsing DOCX files" });
            }
        }

        
        parsedLyrics.forEach((verse, index) => {
            if (docxText[index]) {
                verse.parsedDocxFile = docxText[index].split('\n').filter(line => line.trim());
            } else {
                verse.parsedDocxFile = verse.parsedDocxFile || [];
            }
        });

       
        const newSong = new Song({
            songName,
            selectedInstrument,
            lyrics: parsedLyrics,
            chordDiagrams,
            docxFiles
        });

        await newSong.save();
        return res.status(201).json({ message: "Song added successfully!", song: newSong });
    } catch (error) {
        console.error("Error creating song:", error);
        return res.status(500).json({ message: "Error adding song" });
    }
};

exports.getSongById = async (req, res) => {
    const songId = req.params.id;

    try {
        const song = await Song.findById(songId);
        if (!song) {
            return res.status(404).json({ message: 'Song not found' });
        }

        const lyricsWithParsedDocx = song.lyrics.map((lyric) => ({
            section: lyric.section,
            lyrics: lyric.lyrics,
            parsedDocxFile: lyric.parsedDocxFile || []
        }));

        const songResponse = {
            _id: song._id,
            songName: song.songName,
            selectedInstrument: song.selectedInstrument,
            chordDiagrams: song.chordDiagrams,
            lyrics: lyricsWithParsedDocx,
            docxFiles: song.docxFiles
        };

        res.json(songResponse);
    } catch (error) {
        console.error("Error fetching song details:", error);
        res.status(500).json({ message: 'Error fetching song details' });
    }
};


exports.updateSong = async (req, res) => {
    try {
        const { songName, selectedInstrument } = req.body;

        const updatedSong = await Song.findByIdAndUpdate(
            req.params.id,
            {
                songName,
                selectedInstrument,
                chordDiagrams: req.files?.chordDiagrams ? req.files.chordDiagrams.map(file => path.join('uploads', path.basename(file.path))) : undefined
            },
            { new: true, runValidators: true }
        );

        if (!updatedSong) return res.status(404).json({ message: "Song not found" });

        return res.status(200).json({ message: "Song updated successfully!", song: updatedSong });
    } catch (error) {
        console.error("Error updating song:", error);
        return res.status(500).json({ message: "Error updating song" });
    }
};


exports.getAllSongs = async (req, res) => {
    try {
        const { instrument } = req.query;
        let songs;
        if (instrument) {
            songs = await Song.find({ selectedInstrument: { $regex: new RegExp(instrument, "i") } });
        } else {
            songs = await Song.find();
        }
        return res.status(200).json({ songs });
    } catch (error) {
        console.error("Error fetching songs:", error);
        return res.status(500).json({ message: "Error fetching songs" });
    }
};


exports.parseDocxFile = async (req, res) => {
    try {
        const docxFilePath = req.files.docxFile[0].path;
        const parsedText = await parseDocxText(docxFilePath);
        return res.json({ message: "DOCX file parsed successfully", parsedText });
    } catch (error) {
        console.error("Error parsing DOCX file:", error);
        return res.status(500).json({ message: "Error parsing DOCX file" });
    }
};


exports.deleteSong = async (req, res) => {
    try {
        const songId = req.params.id;
        const deletedSong = await Song.findByIdAndDelete(songId);
        if (!deletedSong) {
            return res.status(404).json({ message: "Song not found" });
        }
        return res.status(200).json({ message: "Song deleted successfully!" });
    } catch (error) {
        console.error("Error deleting song:", error);
        return res.status(500).json({ message: "Error deleting song" });
    }
};