const express = require("express");
const projectsRouter = express.Router();
const supabase = require('../services/supabase');
const { createAbletonRepo } = require("../services/git");
const { UPLOAD_PATH, REPOSITORY_PATH, COLLABORATION_STORAGE_PATH, ARCHIVE_PATH } = require("../config/init");
const fs = require("fs");
const multer = require('multer'); // Import multer
const path = require('path');
const { handlePreviewDiff } = require('../controllers/previewController');
const { compareTrackChanges } = require("../utils/trackComparison");
const archiver = require('archiver');



// Create a new project
projectsRouter.post("/", async (req, res) => {
  try {
    const { userId, title, hashtags, description } = req.body;
    // console.log("Received request body:", req.body);
    
    if (!userId) {
      return res.status(400).json({ error: "Missing required userId" });
    }
    
    // Process hashtags: if empty string or null, use empty array
    const processedHashtags = hashtags ? 
      (typeof hashtags === 'string' ? 
        (hashtags.trim() === '' ? [] : hashtags.split(',').map(tag => tag.trim())) 
        : hashtags) 
      : [];
    
    const { data, error } = await supabase
      .from('Project')
      .insert({ title: title, user_id: userId, hashtags: processedHashtags })
      .select()
      .limit(1)
      .single();
    
    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Database error", details: error.message });
    }
    await createAbletonRepo(data.userId, data.id)
    console.log("Created project:", data);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create project", details: err.message });
  }
});

// Get all projects for a user
projectsRouter.get("/", async (req, res) => {
  const { owner_id } = req.query;
 
  try {
    const { data, error } = await supabase
      .from('Project')
      .select('*, User(name)')
      .eq('user_id', owner_id)
      .order('updated_at', { ascending: false });

    // console.log(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects", details: err.message });
  }
});

// Configure multer for temporary preview uploads in a specific subfolder
const previewStorage = multer.diskStorage({
  destination: function (req, file, cb) {
      const previewDir = path.join(UPLOAD_PATH, 'previews');
      if (!fs.existsSync(previewDir)) {
          fs.mkdirSync(previewDir, { recursive: true });
      }
      cb(null, previewDir);
  },
  filename: function (req, file, cb) {
      // Use a unique name to avoid conflicts
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const previewUpload = multer({ storage: previewStorage });

projectsRouter.post('/preview-diff/:projectId', previewUpload.single('alsFile'), handlePreviewDiff);


// Get a project by ID
projectsRouter.get("/:projectId", async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const { data, error } = await supabase
      .from('Project')
      .select('*, User(name)')
      .eq('id', projectId);


    // send tmp/repositories/projectId/<file>.als
    // send tmp/repositories/projectId/ableton_project.json
    // send tmp/repositories/projectId/tracks/*.wav
        


    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Database error", details: error.message });
    } 
    

    if (!data) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    console.log("Fetched project:", data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch project", details: err.message });
  }
});

// Get list of collab request associated with project
projectsRouter.get("/:projectId/collabs", async (req, res) => {
  const project_id = req.params.projectId;
  const { data, error } = await supabase
    .from('Collab')
    .select('id, User (name), title, description, status, created_at')
    .eq('project_id', project_id);
  
  if (error) {
    return res.status(500).json({
      message: "Failed to fetch collabs",
      error
    })
  }

  const currentJsonPath = path.join(REPOSITORY_PATH, project_id, 'ableton_project.json');
  let currentJson = null;
  if (fs.existsSync(currentJsonPath)) {
    currentJson = fs.readFileSync(currentJsonPath, 'utf8');
  }
  const collab_reqs = data.map(collab_req => {
    const { id } = collab_req;
    const collabJsonPath = path.join(COLLABORATION_STORAGE_PATH, id, 'ableton_project.json');
    
    let collabJson = null;
    if (fs.existsSync(collabJsonPath)) {
      collabJson = fs.readFileSync(collabJsonPath, 'utf8');
    }
    
    trackChanges = compareTrackChanges(currentJson, collabJson);

    return {
      ...collab_req,
      trackChanges
    }
  })

  return res.status(200).json(collab_reqs);
})

// Download endpoint for a single collab req
projectsRouter.get("/:projectId/collabs/:collabId", async (req, res) => {
  const { projectId: project_id, collabId: collab_id } = req.params;
  console.log
  console.log(project_id, collab_id);
  const { data, error } = await supabase
    .from('Collab')
    .select('id, title, User (name)')
    .eq('id', collab_id)
    .eq('project_id', project_id)
    .maybeSingle();
  

  if (error) {
    return res.status(500).json({
      message: "Failed to fetch collab:",
      error
    })
  }
  
  if (!data) {
    return res.status(400).json({
      message: "No such collab req"
    })
  }

  const { title, User: { name:user } } = data;

  const collabDirPath = path.join(COLLABORATION_STORAGE_PATH, collab_id);
  
  if( !fs.existsSync(collabDirPath)){
    console.log("Directory not found");
    return res.status(500).json({ error: "Failed to find collab" });
  }
  const output = fs.createWriteStream(path.join(ARCHIVE_PATH, `${collab_id}.zip`));
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
  });
  output.on('close', function() {
    console.log('Archiver has been finalized and the output file descriptor has closed.');
  });
  archive.on('error', function(err) {
    console.log('Archiver error:', err);
    return res.status(500).json({ error: "Failed to create archive" });
  });
  archive.pipe(output);
  archive.directory(collabDirPath, false);
  archive.finalize();
  // Send the archive
  output.on('close', () => {
    res.setHeader('Content-Type', 'application/zip');
    res.download(path.join(ARCHIVE_PATH, `${collab_id}.zip`), filename = `${title}-${user}.zip`, (err) => {
      if (err) {
        console.error("Download error:", err);
        return res.status(500).json({ error: "Failed to download archive" });
      }
      fs.unlink(path.join(ARCHIVE_PATH, `${collab_id}.zip`), (err) => {
        if (err) {
          console.error("Failed to delete archive:", err);
        } else {
          console.log("Archive deleted successfully");
        }
      })
    })
  });
  
})

module.exports = projectsRouter;