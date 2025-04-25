const express = require("express");
const router = express.Router();
const File = require("../models/file");
const multer = require("multer");
const { storage, cloudinary } = require("../cloudinary/index");
const upload = multer({ storage });
const asyncHandler = require("express-async-handler");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const axios = require("axios");

router.post(
  "/upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    try {
      let filePath, publicId, originalName, fileSize, fileType;

      if (req.file) {
        console.log("Cloudinary file response:", req.file);
        filePath = req.file.path;
        publicId = req.file.filename;
        originalName = req.file.originalname;
        fileSize = req.file.size;
        fileType = req.file.mimetype;
      } else if (req.body.text) {
        const textContent = req.body.text;
        const timestamp = Date.now();
        originalName = req.body.title || `text-${timestamp}.txt`;

        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, originalName);
        await fs.writeFile(tempFilePath, textContent);

        const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
          resource_type: "raw",
          public_id: `text_uploads/${originalName}`,
        });

        await fs.unlink(tempFilePath);

        filePath = uploadResult.secure_url;
        publicId = uploadResult.public_id;
        fileSize = uploadResult.bytes;
        fileType = "text/plain";
      } else {
        return res.status(400).json({ error: "No file or text provided" });
      }

      const newFile = new File({
        pdfName: originalName,
        filePath: filePath,
        publicId: publicId,
        fileSize: fileSize,
        fileType: fileType,
        userId: req.body.userId,
      });

      await newFile.save();

      res.json({
        message: "Successfully uploaded content",
        file: {
          id: newFile._id,
          pdfName: newFile.pdfName,
          filePath: newFile.filePath,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      res
        .status(500)
        .json({ error: "Server error during upload", details: error.message });
    }
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const foundFile = await File.findById(req.params.id);
    if (!foundFile) {
      return res.status(404).json({ error: "File not found" });
    }
    res.json(foundFile);
  })
);

router.get("/fetch-text/:fileId", async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    console.log("FILE");
    console.log(file);
    if (!file) return res.status(404).json({ error: "File not found" });

    const response = await axios.get(file.filePath, { responseType: "text" });
    console.log("FILE RESPONSE");
    //   console.log(response);
    res.json({ text: response.data });
  } catch (error) {
    console.error("Error fetching text:", error);
    res.status(500).json({ error: "Failed to fetch text content" });
  }
});

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.publicId) {
      console.log("Deleting from Cloudinary:", file.publicId);
      await cloudinary.uploader.destroy(file.publicId, {
        resource_type: "raw",
      });
    }

    await file.deleteOne();
    res.json({ message: "File deleted successfully" });
  })
);

module.exports = router;
