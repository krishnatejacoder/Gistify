const express = require('express');
const router = express.Router();
const { cloudinary, storage } = require('../cloudinary/index');
const multer = require('multer');
const upload = multer({ storage });
const Gist = require('../models/Gist');
const Summary = require('../models/Summary'); // 👈 Import the Summary model
const authenticateToken = require('../middleware/auth');
const axios = require('axios');

router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const title = req.body.title || req.file.originalname.split('.')[0];
  const fileContent = req.file.path;
  // console.log(req)

  try {
    console.log("Hai")
    const ragResponse = await axios.post('http://127.0.0.1:5001/summarize', {
      ...req.body,
      file_path: fileContent
    });
    console.log("yaaa")
    console.log(ragResponse)

    const summaryId = ragResponse.data.summaryId;

    // const summary = await Summary.findById(summaryId);
    // if (!summary) return res.status(404).json({ error: 'Summary not found in DB' });

    const gist = new Gist({
      userId: req.userId,
      summaryId: summaryId,
      title
      // chat is null by default
    });

    await gist.save();

    res.json({ gistId: gist._id, title, summaryText: summary.summaryText });
  } catch (error) {
    console.error('Upload error:', error);
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