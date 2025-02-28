const projectRotuer = require('express').Router();
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./tmp/files");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
})
const upload = multer({ storage: storage });

projectRotuer.post('/:id/upload', upload.array('file'), (req, res, next) => {
    console.log(req.body);
    res.status(202).end();
})




module.exports = projectRotuer;