const mongoose = require("mongoose");

const SummarySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  fileId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "File", 
    required: true 
  },
  summaryText: { 
    type: String, 
    required: true 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
});

module.exports = mongoose.model("Summary", SummarySchema);
