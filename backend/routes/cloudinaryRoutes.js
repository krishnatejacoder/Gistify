const express = require('express');
const router = express.Router();
const { cloudinary, storage } = require('../cloudinary/index');
const multer = require('multer');
const upload = multer({ storage });

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: req.file.path, public_id: req.file.filename });
});

router.get('/files', async (req, res) => {
  try {
    const { resources } = await cloudinary.search
      .expression('folder:Gistify')
      .sort_by('public_id', 'desc')
      .max_results(30)
      .execute();
    const files = resources.map(file => ({
      id: file.public_id,
      url: file.secure_url,
      format: file.format
    }));
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get document and summary by ID (for Gist It Page)
router.get('/document/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const file = await cloudinary.api.resource(id, { resource_type: 'raw' });
    res.json({ document: { title: id.split('/')[1], url: file.secure_url }, summary: {
      text: 'This is a placeholder summary.', // Replace with actual summary logic
      advantages: ['Efficient processing', 'User-friendly'],
      disadvantages: ['Limited formats', 'Processing time']
    }});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

module.exports = router;