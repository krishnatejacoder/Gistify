const mongoose = require("mongoose");

// const FileSchema = new mongoose.Schema({
//   userId: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: "User", 
//     required: true 
//   },
//   pdfName: { type: String, required: true },  // Original file name
//   date: { type: Date, default: Date.now },    // Timestamp when file was uploaded

// });

const FileSchema = new mongoose.Schema({
  // userId: { 
  //   type: mongoose.Schema.Types.ObjectId, 
  //   ref: "User"
  //   // required: true 
  // },
  pdfName: { type: String, required: true },
  filePath: { type: String, required: true }, // Path to stored file
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("File", FileSchema);
