const mongoose = require('mongoose');

const gistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  summaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Summary', required: true },
  title: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastVisited: { type: Date, default: Date.now },
  chat: {
    type: [{
      userQuery: { type: String, required: true },
      aiResponse: { type: String, required: true }
    }],
    default: null
  }
});

module.exports = mongoose.model('Gist', gistSchema);