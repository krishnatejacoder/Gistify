const express = require('express');
const router = express.Router();
const File = require('../models/file');
const multer = require('multer');
const {storage} = require('../cloudinary/index');
const upload = multer({storage})

router.get('/', (req,res)=>{
    res.send('FILES ROUTE');
})

router.post('/upload', upload.single('file'), async (req,res)=>{
    const newFile = new File({
        // userId: req.user._id, // Assuming you have user auth middleware
        pdfName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        fileType: req.file.mimetype
    });

    await newFile.save();
    res.json('Successfully uploaded file')
})



router.get('/:id', async (req,res)=>{
    // res.send('SHOWING ONE FILE');
    const foundFile = await File.findById(req.params.id)
    res.json(foundFile);
})



module.exports = router;