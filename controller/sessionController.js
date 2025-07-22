const Session = require('../model/Session');
const fs = require('fs');
const path = require('path');

// Add a new practice session
exports.createSession = async (req, res) => {
    try {
      const { instrument, day, title, description, duration, instructions, mediaUrl } = req.body;
      if (!instrument || !day || !title || !description || !duration || !instructions) {
        return res.status(400).json({ error: "All fields are required" });
      }
      let fileUrl = req.file ? req.file.path : mediaUrl || null;
      const newSession = new Session({
        instrument,
        day,
        title,
        description,
        duration,
        instructions,
        file: fileUrl,
      });
      const savedSession = await newSession.save();
      return res.status(201).json({ message: "Practice session added successfully", session: savedSession });
    } catch (err) {
      return res.status(500).json({ error: "An error occurred while creating the session" });
    }
  };

// Update a practice session
exports.updateSession = async (req, res) => {
    try {
        const { instrument, day, title, description, duration, instructions, mediaUrl } = req.body;
        if (!instrument || !day || !title || !description || !duration || !instructions) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const session = await Session.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        let fileUrl = session.file;
        if (req.file) {
            if (session.file && session.file.includes('uploads')) {
                const oldFilePath = path.resolve(__dirname, '..', session.file);
                if (fs.existsSync(oldFilePath)) {
                    try {
                        fs.unlinkSync(oldFilePath);
                    } catch (err) {
                        // Silent catch
                    }
                }
            }
            fileUrl = req.file.path;
        } else if (mediaUrl) {
            if (session.file && session.file.includes('uploads')) {
                const oldFilePath = path.resolve(__dirname, '..', session.file);
                if (fs.existsSync(oldFilePath)) {
                    try {
                        fs.unlinkSync(oldFilePath);
                    } catch (err) {
                        // Silent catch
                    }
                }
            }
            fileUrl = mediaUrl;
        }

        const updatedSession = await Session.findByIdAndUpdate(
            req.params.id,
            { instrument, day, title, description, duration, instructions, file: fileUrl },
            { new: true }
        );
        return res.status(200).json({ message: 'Session updated successfully', session: updatedSession });
    } catch (err) {
        return res.status(500).json({ error: 'An error occurred while updating the session' });
    }
};

// Delete a practice session
exports.deleteSession = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.file && session.file.includes('uploads')) {
            const filePath = path.resolve(__dirname, '..', session.file);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    // Silent catch
                }
            }
        }

        await Session.findByIdAndDelete(req.params.id);
        return res.status(200).json({ message: 'Session deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: 'An error occurred while deleting the session' });
    }
};

// Get all practice sessions
exports.getAllSessions = async (req, res) => {
    try {
        const sessions = await Session.find();
        return res.status(200).json(sessions);
    } catch (err) {
        return res.status(500).json({ error: 'Error fetching sessions' });
    }
};