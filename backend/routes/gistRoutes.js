const express = require('express');
const router = express.Router();
const { cloudinary, storage } = require('../cloudinary/index');
const multer = require('multer');
const upload = multer({ storage });
const Gist = require('../models/Gist');
const Summary = require('../models/Summary'); // 👈 Import the Summary model
const authenticateToken = require('../middleware/auth');
const axios = require('axios');
const mongoose = require('mongoose'); 

router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const title = req.body.title || req.file.originalname.split('.')[0];
  const fileContent = req.file.path;

  try {
    console.log("Hai")
    const ragResponse = await axios.post('http://127.0.0.1:5001/summarize', {   // check
      ...req.body,
      file_path: fileContent
    });
    console.log("yaaa")
    console.log(ragResponse)

    let summaryId = ragResponse.data.summaryId;
    
    console.log("Fetching summary with ID:", summaryId);
    
    // Convert the string ID to a MongoDB ObjectId
    // This is one of the most common issues when dealing with MongoDB IDs
    try {
      summaryId = new mongoose.Types.ObjectId(summaryId);
      console.log(summaryId)
    } catch (err) {
      console.error("Invalid ObjectId format:", err);
      return res.status(400).json({ error: 'Invalid summary ID format' });
    }
    console.log(summaryId);
    // const summary = await Summary.findById(summaryId);
    const summary = await Summary.findOne({_id: summaryId});
    console.log("Found summary:", summary);
    
    if (!summary) return res.status(404).json({ error: 'Summary not found in DB' });

    const gist = new Gist({
      userId: req.userId,
      summaryId: summaryId,
      title
    });

    await gist.save();

    res.json({ 
      gistId: gist._id,
      title, 
      summaryText: summary.summaryText, 
      fileURL: summary.fileUrl, 
      date: summary.date, 
      summaryType: summary.summaryType 
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Dashboard: Fetch recent summaries
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const gists = await Gist.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(10);
    res.json(gists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent summaries' });
  }
});

// Gist It: Fetch specific research paper and summary
router.get('/document/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const gist = await Gist.findOne({ _id: id, userId: req.user.id });
    if (!gist) return res.status(404).json({ error: 'Gist not found' });
    res.json(gist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Gist History: Fetch all user gists
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const gists = await Gist.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(gists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;