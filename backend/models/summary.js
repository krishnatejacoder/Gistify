const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
  userId: { type: String, required: true }, 
  doc_id: { type: String }, 
  file_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  summary: { type: String, required: true },
  advantages: { type: [String], default: [] },
  disadvantages: { type: [String], default: [] },
  file_name: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  summary_type: { type: String, required: true },
});

// Explicitly map to 'summary' collection
module.exports = mongoose.model('Summary', summarySchema, 'Summary');