const projectRotuer = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const supabase = require('../config/supabase');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./tmp/files");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
})
const upload = multer({ storage: storage });

/*
Endpoint for fetching files in repository
*/
projectRotuer.get('/:id/files', async (req, res) => {
    const repositoryId = req.params.id;
    const { data, error } = await supabase
        .from('Project')
        .select('id, title')
        .eq('id', repositoryId)
        .limit(1)
        .single();

    if (error) {
        return res.status(404).json(error);
    } 
    console.log(data)
    const repositoryName = `${data.id}-${data.title}`;
    const repositoryPath = `./tmp/repositories/${repositoryName}`
    console.log(repositoryName);

    fs.readdir(repositoryPath, (err, fileNames) => {
        if (err) {
            return res.status(404).json({ error: "Repository does not exist" });
        }
        console.log("Repository contains:");
        fileNames = fileNames.filter(fileName => fileName !== '.git')
        res.status(200).send(fileNames);
    })
}) 

projectRotuer.post('/:id/upload', upload.array('file'), (req, res, next) => {
    console.log(req.body);
    res.status(202).end();
})




module.exports = projectRotuer;