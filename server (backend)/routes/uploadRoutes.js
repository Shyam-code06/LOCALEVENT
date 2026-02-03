const express = require('express');
const router = express.Router();
const upload = require('../utils/fileUpload');
const fs = require('fs');
const path = require('path');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileName = `upload_${Date.now()}_${Math.round(Math.random() * 1E9)}.png`;
        const uploadPath = path.join(__dirname, '..', 'uploads', fileName);

        if (!fs.existsSync(path.join(__dirname, '..', 'uploads'))) {
            fs.mkdirSync(path.join(__dirname, '..', 'uploads'), { recursive: true });
        }

        fs.writeFileSync(uploadPath, req.file.buffer);
        const imageUrl = `http://localhost:5000/uploads/${fileName}`;

        res.json({ imageUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
