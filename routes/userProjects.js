const express = require("express");
const router = express.Router();
const UserProject = require("../models/UserProject");

// Create a new project
router.post("/", async (req, res) => {
  res.json({ message: "placeholder create project message"});
});

// Get all projects for a user
router.get("/:userId", async (req, res) => {
  res.json([{
    id: "randomuuid",
    title: "Placeholder Project",
    createdBy: "john-doe",
    userId: "123456789",
    hashtags: ["#this", "#is", "#a", "#placeholder"],
    createdAt: "2021-10-01T00:00:00.000Z",
    updatedAt: "2021-10-01T00:00:00.000Z"
  },
  {
    id: "randomuuid2",
    title: "Placeholder Project 2",
    createdBy: "john-doe",
    userId: "123456789",
    hashtags: ["#this", "#is", "#another", "#placeholder"],
    createdAt: "2021-10-01T00:00:00.000Z",
    updatedAt: "2021-10-01T00:00:00.000Z"
  }]);
});

// Get a project by ID
router.get("/project/:projectId", async (req, res) => {
  res.json({
    id: "randomuuid",
    title: "Placeholder Project",
    createdBy: "john-doe",
    userId: "123456789",
    hashtags: ["#this", "#is", "#a", "#placeholder"],
    createdAt: "2021-10-01T00:00:00.000Z",
    updatedAt: "2021-10-01T00:00:00.000Z"
  });
});

module.exports = router;