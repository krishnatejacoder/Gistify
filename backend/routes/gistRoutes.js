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
  try {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    const title = req.body.file_name || (req.file ? req.file.originalname.split('.')[0] : 'text-upload');
    const text = req.body.text;
    const selectedUploadOption = req.body.selectedUploadOption;

    // Map summary_type to Flask-compatible values
    const summaryTypeMap = {
      'concise': 'summary_concise',
      'analytical': 'summary_analytical',
      'comprehensive': 'summary_comprehensive'
    };
    const summaryType = summaryTypeMap[req.body.summary_type?.toLowerCase()];
    if (!summaryType) {
      console.error('Invalid summary_type received:', req.body.summary_type);
      return res.status(400).json({ error: 'Invalid summary type provided' });
    }

    if (!req.user.userId || !mongoose.Types.ObjectId.isValid(req.user.userId)) {
      console.error('Invalid or missing userId from authenticateToken:', req.user.userId);
      return res.status(401).json({ error: 'Valid user authentication required' });
    }

    let docId, filePath;

    // Handle file upload (selectedUploadOption == 0)
    if (selectedUploadOption == 0) {
      if (!req.body.doc_id || !mongoose.Types.ObjectId.isValid(req.body.doc_id)) {
        console.error('Invalid or missing MongoDB file ID:', req.body.doc_id);
        return res.status(400).json({ error: 'Valid MongoDB file ID required' });
      }

      // Retrieve File document from MongoDB
      const fileDoc = await File.findById(req.body.doc_id);
      if (!fileDoc) {
        console.error('File not found in MongoDB for ID:', req.body.doc_id);
        return res.status(404).json({ error: 'File not found in database' });
      }

      // Fetch file from Cloudinary URL
      const cloudinaryUrl = fileDoc.filePath; // Changed from fileUrl to filePath
      if (!cloudinaryUrl) {
        console.error('No Cloudinary URL in File document:', fileDoc);
        return res.status(400).json({ error: 'File document missing Cloudinary URL' });
      }

      console.log('Fetching file from Cloudinary:', cloudinaryUrl);
      const fileResponse = await axios.get(cloudinaryUrl, { responseType: 'arraybuffer' });
      const fileBuffer = Buffer.from(fileResponse.data);

      // Send file to Flask /upload endpoint
      const uploadFormData = new FormData();
      uploadFormData.append('file', fileBuffer, {
        filename: fileDoc.pdfName || 'document.pdf',
        contentType: fileDoc.fileType === 'application/pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      console.log('Sending file to Flask /upload...');
      const uploadResponse = await axios.post('http://127.0.0.1:5001/upload', uploadFormData, {
        headers: {
          ...uploadFormData.getHeaders(),
        },
      });
      console.log('Flask /upload Response:', JSON.stringify(uploadResponse.data, null, 2));

      if (!uploadResponse.data.doc_id || !uploadResponse.data.cloudinary_url) {
        console.error('Invalid response from Flask /upload:', uploadResponse.data);
        return res.status(500).json({ error: 'Failed to upload file to Flask' });
      }

      docId = uploadResponse.data.doc_id;
      filePath = uploadResponse.data.cloudinary_url;
    } else if (selectedUploadOption == 1) {
      // Text upload: Generate a doc_id and send text to /summarize
      if (!text) {
        console.error('No text provided for text upload option');
        return res.status(400).json({ error: 'Text is required for text upload' });
      }
      docId = new mongoose.Types.ObjectId().toString(); // Generate a unique ID
      filePath = '';
      // Note: For text uploads, Flask /summarize handles text directly
    } else {
      console.error('Invalid selectedUploadOption:', selectedUploadOption);
      return res.status(400).json({ error: 'Invalid upload option' });
    }

    // Call Flask /summarize endpoint
    const summarizeFormData = new FormData();
    summarizeFormData.append('doc_id', docId);
    summarizeFormData.append('file_path', filePath);
    summarizeFormData.append('summary_type', summaryType);
    summarizeFormData.append('file_name', req.body.file_name || title);
    summarizeFormData.append('user_id', req.user.userId);
    summarizeFormData.append('text', text || '');

    console.log('Summarize FormData contents:', {
      doc_id: docId,
      file_path: filePath,
      summary_type: summaryType,
      file_name: req.body.file_name || title,
      user_id: req.user.userId,
      text: text || ''
    });

    const ragResponse = await axios.post('http://127.0.0.1:5001/summarize', summarizeFormData, {
      headers: {
        ...summarizeFormData.getHeaders(),
      },
    });
    console.log('Flask /summarize Response:', JSON.stringify(ragResponse.data, null, 2));

    if (!ragResponse.data.summaryId || !ragResponse.data.chromaId) {
      console.error('Missing summaryId or chromaId in Flask response:', ragResponse.data);
      return res.status(500).json({ error: 'Invalid response from summarization service' });
    }

    const gist = new Gist({
      userId: req.user.userId,
      summaryId: ragResponse.data.summaryId,
      title,
    });
    await gist.save();

    const resp = {
      gistId: gist._id,
      title,
      summary: ragResponse.data.summary,
      advantages: ragResponse.data.advantages,
      disadvantages: ragResponse.data.disadvantages,
      fileURL: ragResponse.data.fileUrl || filePath,
      docId: ragResponse.data.chromaId,
      chromaId: ragResponse.data.chromaId,
      date: Date.now(),
      summaryType: req.body.summary_type?.toLowerCase(),
    };

    console.log('Response:', JSON.stringify(resp, null, 2));
    res.json(resp);
  } catch (error) {
    console.error('Upload error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to generate summary'
    });
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
      date: file.date,
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