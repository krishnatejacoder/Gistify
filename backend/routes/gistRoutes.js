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
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    const title = req.body.file_name || (req.file ? req.file.originalname.split('.')[0] : 'text-upload');
    const text = req.body.text;
    const selectedUploadOption = req.body.selectedUploadOption;

    const summaryTypeMap = {
      'concise': 'summary_concise',
      'analytical': 'summary_analytical',
      'comprehensive': 'summary_comprehensive'
    };
    const summaryType = summaryTypeMap[req.body.summary_type?.toLowerCase()];
    console.log(summaryType)
    if (!summaryType) {
      console.error('Invalid summary_type received:', req.body.summary_type);
      return res.status(400).json({ error: 'Invalid summary type provided' });
    }

    if (!req.user.userId || !mongoose.Types.ObjectId.isValid(req.user.userId)) {
      console.error('Invalid or missing userId from authenticateToken:', req.user.userId);
      return res.status(401).json({ error: 'Valid user authentication required' });
    }

    let docId, filePath, fileId;

    if (selectedUploadOption == 0) {
      if (!req.body.doc_id || !mongoose.Types.ObjectId.isValid(req.body.doc_id)) {
        console.error('Invalid or missing MongoDB file ID:', req.body.doc_id);
        return res.status(400).json({ error: 'Valid MongoDB file ID required' });
      }

      const fileDoc = await File.findById(req.body.doc_id);
      if (!fileDoc) {
        console.error('File not found in MongoDB for ID:', req.body.doc_id);
        return res.status(404).json({ error: 'File not found in database' });
      }

      const cloudinaryUrl = fileDoc.filePath;
      if (!cloudinaryUrl) {
        console.error('No Cloudinary URL in File document:', fileDoc);
        return res.status(400).json({ error: 'File document missing Cloudinary URL' });
      }

      console.log('Fetching file from Cloudinary:', cloudinaryUrl);
      const fileResponse = await axios.get(cloudinaryUrl, { responseType: 'arraybuffer' });
      const fileBuffer = Buffer.from(fileResponse.data);

      const uploadFormData = new FormData();
      uploadFormData.append('file', fileBuffer, {
        filename: fileDoc.pdfName || 'document.pdf',
        contentType: fileDoc.fileType === 'application/pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      uploadFormData.append('secure_url', cloudinaryUrl)

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
      fileId = req.body.doc_id; // MongoDB file ID
    } 
    else if (selectedUploadOption == 1) {
      // Text upload: Store the text in Cloudinary first
      if (!text) {
        console.error('No text provided for text upload option');
        return res.status(400).json({ error: 'Text is required for text upload' });
      }
    
      try {
        // 1. Upload text to Cloudinary as a raw file
        const timestamp = Date.now();
        const fileName = `text-${timestamp}.txt`;
        
        // Create a temporary file to upload
        const tempFilePath = path.join(os.tmpdir(), fileName);
        await fs.writeFile(tempFilePath, text);
        
        const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
          resource_type: 'raw',
          folder: 'gistify',
          public_id: fileName
        });
        
        await fs.unlink(tempFilePath); // Clean up temp file
    
        if (!uploadResult.secure_url) {
          throw new Error('Cloudinary upload failed');
        }
    
        // 2. Send to Flask /upload_text endpoint for ChromaDB storage
        const flaskFormData = new FormData();
        flaskFormData.append('text', text);
        flaskFormData.append('file_name', fileName);
        flaskFormData.append('user_id', req.user.userId);
        flaskFormData.append('cloudinary_url', uploadResult.secure_url);
    
        const flaskResponse = await axios.post('http://127.0.0.1:5001/upload_text', flaskFormData, {
          headers: {
            ...flaskFormData.getHeaders(),
          },
        });
    
        if (!flaskResponse.data.doc_id) {
          throw new Error('Failed to store text in ChromaDB');
        }
    
        docId = flaskResponse.data.doc_id;
        filePath = flaskResponse.data.cloudinary_url;
        fileId = req.body.doc_id;
    
      } catch (error) {
        console.error('Text upload error:', error);
        return res.status(500).json({ error: 'Failed to process text upload' });
      }
    } else {
      console.error('Invalid selectedUploadOption:', selectedUploadOption);
      return res.status(400).json({ error: 'Invalid upload option' });
    }

    // Rest of your existing code...
    // Call Flask /summarize endpoint
    const summarizeFormData = new FormData();
    summarizeFormData.append('doc_id', docId);
    summarizeFormData.append('file_path', filePath);
    summarizeFormData.append('summary_type', summaryType);
    summarizeFormData.append('file_name', req.body.file_name || title);
    summarizeFormData.append('user_id', req.user.userId);
    summarizeFormData.append('text', text || '');
    summarizeFormData.append('file_id', fileId || '');

    console.log('Summarize FormData contents:', {
      doc_id: docId,
      file_path: filePath,
      summary_type: summaryType,
      file_name: req.body.file_name || title,
      user_id: req.user.userId,
      text: text || '',
      file_id: fileId || ''
    });

    const ragResponse = await axios.post('http://127.0.0.1:5001/summarize', summarizeFormData, {
      headers: {
        ...summarizeFormData.getHeaders(),
      },
    });
    console.log('Flask /summarize Response:', JSON.stringify(ragResponse.data, null, 2));

    // if (!ragResponse.data.summaryId || !ragResponse.data.chromaId) {
    //   console.error('Missing summaryId or chromaId in Flask response:', ragResponse.data);
    //   return res.status(500).json({ error: 'Invalid response from summarization service' });
    // }

    // Save Gist
    const gist = new Gist({
      userId: req.user.userId,
      summaryId: ragResponse.data.summary_id,
      title,
    });
    await gist.save();
    console.log('Gist saved:', gist);

    // Save Summary in MongoDB (Express side)
    // const summary = new Summary({
    //   _id: ragResponse.data.summaryId,
    //   userId: req.user.userId,
    //   file_id: fileId || null,
    //   summary: ragResponse.data.summary,
    //   advantages: ragResponse.data.advantages,
    //   disadvantages: ragResponse.data.disadvantages,
    //   fileUrl: ragResponse.data.fileUrl,
    //   chromaId: ragResponse.data.chromaId,
    //   summaryType: req.body.summary_type?.toLowerCase(),
    // });
    // await summary.save();
    // console.log('Summary saved:', summary);

    const resp = {
      gistId: gist._id,
      title,
      summary: ragResponse.data.summary,
      advantages: JSON.stringify(ragResponse.data.advantages),
      disadvantages: JSON.stringify(ragResponse.data.disadvantages),
      fileURL: ragResponse.data.fileUrl || filePath,
      docId,
      chromaId: docId,
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

    const data = await Promise.all(
      gists.map(async (gist) => {
        const summary = await Summary.findOne({ _id: gist.summaryId });
        if (!summary) {
          console.error('Summary not found for summaryId:', gist.summaryId);
          return {
            ...gist.toObject(),
            summary: null,
            truncatedSummary: null,
            advantages: 'Unknown',
            disadvantages: 'Unknown',
            file_id: null,
            fileUrl: null,
            chromaId: null,
            summaryType: null,
            sourceType: null,
          };
        }

        let file = null;
        if (summary.file_id && mongoose.Types.ObjectId.isValid(summary.file_id)) {
          file = await File.findOne({ _id: summary.file_id });
        }

        let truncatedSummary = summary.summary;
        if (truncatedSummary && truncatedSummary.length > 100) {
          truncatedSummary = truncatedSummary.substring(0, 100) + '...';
        }

        return {
          ...gist.toObject(),
          summary: summary.summary,
          truncatedSummary: truncatedSummary || null,
          advantages: summary.advantages || 'Unknown',
          disadvantages: summary.disadvantages || 'Unknown',
          file_id: summary.file_id || null,
          fileUrl: summary.fileUrl || null,
          chromaId: summary.chromaId || null,
          summaryType: summary.summaryType || null,
          sourceType: file ? file.fileType : null,
        };
      })
    );

    console.log('Recent gists data:', JSON.stringify(data, null, 2));
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
    if (!summary) {
      console.error('Summary not found for summaryId:', gist.summaryId);
      return res.status(404).json({ error: 'Summary not found' });
    }
    console.log("summary")
    console.log(summary)

    let fileName = 'Text Upload';
    let fileType = 'text/plain';
    let gistDate = gist.createdAt || new Date();

    if (summary.file_id && mongoose.Types.ObjectId.isValid(summary.file_id)) {
      const file = await File.findOne({ _id: summary.file_id });
      if (file) {
        fileName = file.pdfName || 'Unknown File';
        fileType = file.fileType || 'application/octet-stream';
      }
    }

    res.json({
      ...gist.toObject(),
      summary: summary.summary,
      advantages: summary.advantages || [],
      disadvantages: summary.disadvantages || [],
      fileName,
      file_id: summary.file_id || null,
      sourceType: fileType,
      chromaId: summary.doc_id || null,
      fileUrl: summary.fileUrl,
      summaryType: summary.summary_type || null,
      date: gistDate,
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});


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