const express = require("express");
const projectsRouter = express.Router();
const supabase = require('../config/supabase')

// Create a new project
projectsRouter.post("/", async (req, res) => {
  try {
    const { userId, title, hashtags } = req.body;
    console.log(req.body);
    const { data, error } = await supabase
      .from('Project')
      .insert({ title: title, user_id: userId, hashtags: hashtags })
      .select();

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to create project", details: err.message });
  }
});

// Get all projects for a user full url: http://localhost:3333/api/user_projects/:userId
projectsRouter.get("/", async (req, res) => {
  const { owner_id } = req.query;
 
  try {
    const { data, error } = await supabase
      .from('Project')
      .select('*')
      .eq('user_id', owner_id)
      .order('updated_at', { ascending: false });
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
      .select('*')
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