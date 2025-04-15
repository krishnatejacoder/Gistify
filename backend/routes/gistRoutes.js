const express = require('express');
const router = express.Router();
const { cloudinary, storage } = require('../cloudinary/index');
const multer = require('multer');
const upload = multer({ storage });
const Gist = require('../models/Gist');
const authenticateToken = require('../middleware/auth');
const axios = require('axios'); // For Flask RAG API call

// Dashboard: Upload research paper
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const title = req.body.title || req.file.originalname.split('.')[0];
  const fileContent = req.file.path; // Path to send to RAG
  try {
    const ragResponse = await axios.post('http://localhost:5000/summarize', { file: fileContent });
    const summary = ragResponse.data.summary;
    const gist = new Gist({ userId: req.user.id, fileUrl: req.file.path, summary, title });
    await gist.save();
    res.json({ url: req.file.path, public_id: req.file.filename, summary, title });
  } catch (error) {
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