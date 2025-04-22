const express = require('express');
const router = express.Router();
const { cloudinary, storage } = require('../cloudinary/index');
const multer = require('multer');
const upload = multer({ storage });
const Gist = require('../models/Gist');
const Summary = require('../models/Summary');
const authenticateToken = require('../middleware/auth');
const axios = require('axios');
const mongoose = require('mongoose');

router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (req.body.selectedUploadOption == 0 && !req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    console.log('Hai');
    let fileContent = req.file ? req.file.path : null;
    const title = req.body.title || (req.file ? req.file.originalname.split('.')[0] : 'text-upload');
    const text = req.body.text; // Handle text input

    const ragResponse = await axios.post('http://127.0.0.1:5001/summarize', {
      ...req.body,
      file_path: fileContent,
      text: text, // Pass text if provided
    });
    console.log('yaaa');
    console.log(ragResponse);

    let summaryId = ragResponse.data.summaryId;

    console.log('Fetching summary with ID:', summaryId);
    const summary = await Summary.findOne({ _id: summaryId });
    console.log('Found summary:', summary);
    console.log('Chroma ID:', ragResponse.data.chromaId);

    if (!summary) return res.status(404).json({ error: 'Summary not found in DB' });

    const gist = new Gist({
      userId: req.body.userId,
      summaryId: summaryId,
      title,
    });

    await gist.save();
    const resp = {
      gistId: gist._id,
      title,
      summary: summary.summary,
      advantages: summary.advantages,
      disadvantages: summary.disadvantages,
      fileURL: summary.fileUrl,
      docId: summary.file_id,
      chromaId: ragResponse.data.chromaId,
      date: Date.now(),
      summaryType: summary.summaryType,
    };

    console.log(resp);
    res.json(resp);
  } catch (error) {
    console.error('Upload error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const gists = await Gist.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(3);
    console.log('Gists fetched:', gists);

    const data = await Promise.all(
      gists.map(async (gist) => {
        const summary = await Summary.findOne({ _id: gist.summaryId });
        let truncatedSummary = summary.summary
        if(truncatedSummary.length > 100){
          truncatedSummary = truncatedSummary.substring(0, 100) + '...'
        }
        return {
          ...gist.toObject(), 
          summary: summary ? summary.summary : null,
          truncatedSummary: truncatedSummary ? truncatedSummary : null,
          advantages: summary ? summary.advantages : 'Unknown',
          disadvantages: summary ? summary.disadvantages : 'Unknown',
          file_id: summary ? summary.file_id : null,
          fileUrl: summary ? summary.fileUrl : null,
          chromaId: summary ? summary.chromaId : null,
          summaryType: summary ? summary.summaryType : null,
        };
      })
    );

    // console.log('Response data:', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching recent summaries:', error);
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
    const gists = await Gist.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    // console.log(gists)
    // console.log(req)
    res.json(gists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;