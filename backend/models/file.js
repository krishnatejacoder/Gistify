const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    pdfName: { type: String, required: true },
    filePath: { type: String, required: true },
    publicId: { type: String },
    fileSize: { type: Number, required: true },
    fileType: { type: String, required: true },
});

module.exports = mongoose.model('File', FileSchema);