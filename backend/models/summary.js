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
  fileUrl: { type: String, required: true },
  chromaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "ChromaDB", 
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
  summaryType : {
    type : String,
    enum : ['concise','analytical','comprehensive'],
    required : true
  }
});

module.exports = mongoose.model("Summary", SummarySchema);
