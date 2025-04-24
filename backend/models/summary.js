const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Matches Flask's user_id
  doc_id: { type: String }, // ChromaDB ID
  file_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  summary: { type: String, required: true },
  advantages: { type: [String], default: [] }, // Array of strings
  disadvantages: { type: [String], default: [] }, // Array of strings
  file_path: { type: String, default: '' },
  file_name: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  chromaId: { type: String, required: true },
  summaryType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Explicitly map to 'summary' collection
module.exports = mongoose.model('Summary', summarySchema, 'Summary');