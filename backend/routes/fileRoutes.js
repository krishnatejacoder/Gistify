const express = require('express');
const router = express.Router();
const File = require('../models/file');
const multer = require('multer');
const { storage, cloudinary } = require('../cloudinary/index');
const upload = multer({ storage });
const asyncHandler = require('express-async-handler');

router.get('/', (req, res) => {
    res.send('FILES ROUTE');
});

router.post(
    '/upload',
    upload.single('file'),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log('Cloudinary response:', req.file); // Debug upload
        const newFile = new File({
            pdfName: req.file.originalname,
            filePath: req.file.path,
            publicId: req.file.filename,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
        });

        await newFile.save();
        res.json({
            message: 'Successfully uploaded file',
            file: {
                id: newFile._id,
                pdfName: newFile.pdfName,
                filePath: newFile.filePath,
            },
        });
    })
);

router.get(
    '/:id',
    asyncHandler(async (req, res) => {
        const foundFile = await File.findById(req.params.id);
        if (!foundFile) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json(foundFile);
    })
);

router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        if (file.publicId) {
            console.log('Deleting from Cloudinary:', file.publicId); // Debug deletion
            await cloudinary.uploader.destroy(file.publicId);
        }

        await file.deleteOne();
        res.json({ message: 'File deleted successfully' });
    })
);

module.exports = router;