const express = require("express");
const projectsRouter = express.Router();
const supabase = require('../services/supabase');
const { createAbletonRepo } = require("../services/git");
const { UPLOAD_PATH, REPOSITORY_PATH } = require("../config/init");
const fs = require("fs");
const multer = require('multer'); // Import multer
const path = require('path');
const { handlePreviewDiff } = require('../controllers/previewController');


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



module.exports = projectsRouter;