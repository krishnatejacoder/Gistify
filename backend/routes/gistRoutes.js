const express = require('express');
const router = express.Router();
const { cloudinary, storage } = require('../cloudinary/index');
const multer = require('multer');
const upload = multer({ storage });
const Gist = require('../models/Gist');
const File = require('../models/file');
const Summary = require('../models/summary');
const authenticateToken = require('../middleware/auth');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose'); // Add this import

router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (req.body.selectedUploadOption == 0 && !req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    console.log('Hai');
    console.log(req.body);
    // let fileContent = req.file ? req.file.path : null;
    const title = req.body.file_name || (req.file ? req.file.originalname.split('.')[0] : 'text-upload');
    const text = req.body.text;

    const formData = new FormData();
    formData.append('doc_id', req.body.doc_id || '');
    formData.append('file_path', req.body.file_path || '');
    formData.append('summary_type', req.body.summary_type || '');
    formData.append('file_name', req.body.file_name || title);
    formData.append('user_id', req.body.userId || '');
    formData.append('text', text || '');

    console.log('FormData constructed, sending to Flask...');

    const ragResponse = await axios.post('http://127.0.0.1:5001/summarize', formData, {
      headers: {
        ...formData.getHeaders(), 
      },
    });
    console.log('yaaa');
    console.log(ragResponse.data);

    let summaryId = ragResponse.data.summaryId;

    console.log('Fetching summary with ID:', summaryId);
    const summary = await Summary.findOne({ _id: summaryId });
    console.log('Found summary:', summary);
    console.log('Chroma ID:', ragResponse.data.chromaId);

    if (!summary) return res.status(404).json({ error: 'Summary not found in DB' });

    const gist = new Gist({
      userId: req.user.userId,
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
    // console.log('Gists fetched:', gists);

    const data = await Promise.all(
      gists.map(async (gist) => {
        const summary = await Summary.findOne({ _id: gist.summaryId });
        const file = await File.findOne({_id: summary.file_id});
        // console.log(file.fileType)
        let truncatedSummary = summary.summary
        if(truncatedSummary.length > 100){
          truncatedSummary = truncatedSummary.substring(0, 100) + '...'
        }
        const respData = {
          ...gist.toObject(), 
          summary: summary ? summary.summary : null,
          truncatedSummary: truncatedSummary ? truncatedSummary : null,
          advantages: summary ? summary.advantages : 'Unknown',
          disadvantages: summary ? summary.disadvantages : 'Unknown',
          file_id: summary ? summary.file_id : null,
          fileUrl: summary ? summary.fileUrl : null,
          chromaId: summary ? summary.chromaId : null,
          summaryType: summary ? summary.summaryType : null,
          sourceType: file ? file.fileType : null,
        }
        // console.log(respData)
        return respData;
      })
    );

    console.log(data)

    // console.log('Response data:', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching recent summaries:', error);
    res.status(500).json({ error: 'Failed to fetch recent summaries' });
  }
});

router.get('/document/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const gist = await Gist.findOne({ _id: id, userId: req.user.userId });
    if (!gist) {
      return res.status(404).json({ error: 'Gist not found' });
    }

    const summary = await Summary.findOne({ _id: gist.summaryId });
    const file = await File.findOne({ _id: summary.file_id });
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    let fileName = 'Text Upload';
    if (summary.file_id) {
      const file = await File.findOne({ _id: summary.file_id });
      fileName = file ? file.pdfName : 'Unknown File';
    }

    // console.log(file.fileType)

    res.json({
      ...gist.toObject(),
      summary: summary.summary,
      advantages: summary.advantages,
      disadvantages: summary.disadvantages,
      fileName: fileName,
      file_id: summary.file_id,
      sourceType: file.fileType,
      chromaId: summary.chromaId,
      fileUrl: summary.fileUrl,
      chromaId: summary.chromaId,
      summaryType: summary.summaryType,
    });
  } catch (error) {
    console.error('Error fetching document:', error);
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