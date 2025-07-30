const Favorite = require('../model/Favorite');
const Song = require('../model/Song');

exports.getFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const favorites = await Favorite.findOne({ userId })
            .populate('songIds');

        if (!favorites) {
            return res.status(404).json({ message: 'No favorites found' });
        }

        res.json(favorites);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

const toggleFavoriteSong = async (req, res) => {
    const userId = req.user.id;
    const { songId } = req.body;

    if (!songId) {
        return res.status(400).json({ error: "Song ID is required" });
    }

    try {
        // Validate songId
        const songExists = await Song.findById(songId);
        if (!songExists) {
            return res.status(400).json({ error: "Invalid song ID" });
        }

        let favorite = await Favorite.findOne({ userId });
        if (!favorite) {
            favorite = new Favorite({ userId, songIds: [], lessonIds: [] });
        }

        // Ensure string comparison
        const songIdStr = songId.toString();
        if (favorite.songIds.some(id => id.toString() === songIdStr)) {
            favorite.songIds = favorite.songIds.filter(id => id.toString() !== songIdStr);
        } else {
            favorite.songIds.push(songId);
        }

        await favorite.save();
        // Log for debugging (remove after testing)
        
        res.status(200).json({ message: "Favorite toggled successfully", favorite });
    } catch (error) {
        res.status(500).json({ error: "Failed to toggle favorite" });
    }
};

exports.toggleFavoriteSong = toggleFavoriteSong;