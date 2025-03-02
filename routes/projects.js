const express = require("express");
const projectsRouter = express.Router();
const supabase = require('../services/supabase');
const Git = require("../services/git");
const { REPOSITORY_PATH } = require("../config/init");

// Create a new project
projectsRouter.post("/", async (req, res) => {
  try {
    const { userId, title, hashtags } = req.body;
    console.log("Received request body:", req.body);
    
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
    const git = new Git(REPOSITORY_PATH);
    await git.createAbletonRepo(data.userId, data.id)
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

// Get a project by ID
projectsRouter.get("/:projectId", async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const { data, error } = await supabase
      .from('Project')
      .select('*, User(name)')
      .eq('id', projectId);

    if (!data) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch project", details: err.message });
  }
});

module.exports = projectsRouter;