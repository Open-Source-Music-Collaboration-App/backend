const express = require("express");
const router = express.Router();
const UserProject = require("../models/UserProject");

// Create a new project
router.post("/", async (req, res) => {
  try {
    const { userId, title, createdBy, hashtags } = req.body;

    const project = await UserProject.create({ userId, title, createdBy, hashtags });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: "Failed to create project", details: err.message });
  }
});

// Get all projects for a user full url: http://localhost:3333/api/user_projects/:userId
router.get("/:userId", async (req, res) => {
  try {
    const projects = await UserProject.findAll({
      where: { userId: req.params.userId },
      order: [['updatedAt', 'DESC']], // Show most recently updated first
    });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects", details: err.message });
  }
});

// Get a project by ID
router.get("/project/:projectId", async (req, res) => {
  try {
    const project = await UserProject.findByPk(req.params.projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch project", details: err.message });
  }
});

module.exports = router;