const SongRequest = require('../model/songRequest');
const asyncHandler = require('express-async-handler');

// @desc    Create a new song request
// @route   POST /api/song-requests
// @access  Private
const createSongRequest = asyncHandler(async (req, res) => {
  const { name, instrument, description } = req.body;

  // Validate input
  if (!name || !instrument) {
    res.status(400);
    throw new Error('Song name and instrument are required');
  }

  // Create song request
  const songRequest = await SongRequest.create({
    name,
    instrument,
    description,
    user: req.user._id // From auth middleware
  });

  // Populate user details (name) for response
  await songRequest.populate('user', 'name');

  res.status(201).json({
    success: true,
    data: songRequest
  });
});

// @desc    Get all song requests
// @route   GET /api/song-requests
// @access  Private (Admin only)
const getAllSongRequests = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view song requests');
  }

  const songRequests = await SongRequest.find().populate('user', 'name').sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: songRequests.length,
    data: songRequests
  });
});

module.exports = {
  createSongRequest,
  getAllSongRequests
};