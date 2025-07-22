const mongoose = require('mongoose');

const songRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Song name is required'],
    trim: true,
    maxlength: [100, 'Song name cannot exceed 100 characters']
  },
  instrument: {
    type: String,
    required: [true, 'Instrument is required'],
    enum: {
      values: ['guitar', 'piano', 'ukulele'],
      message: 'Instrument must be one of: guitar, piano, ukulele'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SongRequest', songRequestSchema);