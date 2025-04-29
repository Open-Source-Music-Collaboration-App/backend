const express = require("express");
const featuresRouter = express.Router();
const supabase = require("../services/supabase");
const { REPOSITORY_PATH } = require("../config/init");
const fs = require("fs");
const { create } = require("domain");

// Create a new feature
featuresRouter.post("/", async (req, res) => {
  try {
    const {
      project_id,
      author_id,
      message,
      description,
      label,
      open = true,
      // When user creates a new feature, set the creation and updating time
      created_at = new Date(),
      updated_at = new Date(),
    } = req.body;

    // console.log("Received request body:", req.body);

    if (!author_id) {
      return res.status(400).json({ error: "Missing required user_id" });
    }

    // TODO: Is it fine if message or description is NULL?

    const { data, error } = await supabase
      .from("Feature")
      .insert({
        project_id: project_id,
        author_id: author_id,
        message: message,
        description: description,
        label: label,
        open: open,
        created_at: created_at,
        updated_at: updated_at,
      })
      .select()
      .limit(1)
      .single();


    if (error) {
      console.error("Supabase error:", error);
      return res
        .status(500)
        .json({ error: "Database error", details: error.message });
    }
    console.log("Created feature:", data);
    res.status(201).json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create a feature", details: err.message });
  }
});

// Closing and Updating a feature
featuresRouter.put("/:feature_id", async (req, res) => {
  try {
    const id = req.params.feature_id;
    const {
      open,
      message,
      description,
      label,
      updated_at = new Date(),
    } = req.body;

    console.log("Received request body:", req.body);

    if (!id) {
      return res.status(400).json({ error: "Missing required user_id" });
    }
    const update_payload = {};

    // Undefined open: Update the feature
    // Defined open: Close the feature
    if (open !== undefined) update_payload.open = open;

    // Undefined description: Close the feature
    // Defined feature: Update the feature
    if (description !== undefined) update_payload.description = description;
    if (label) update_payload.label = label;

    // TODO: If the new message is empty, how should we handle it? Should we allow users to update the message
    if (message) update_payload.message = message;
    update_payload.updated_at = updated_at;

    const { data, error } = await supabase
      .from("Feature")
      .update(update_payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return res
        .status(500)
        .json({ error: "Database error", details: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Feature not found" });
    }

    console.log("Updated feature", data);
    res.status(201).json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch features", details: err.message });
  }
});

featuresRouter.delete("/:feature_id", async (req, res) => {
  try {

    console.log("deleting feature");
    const id = req.params.feature_id;

    console.log("id", id);

    if (!id) {
      return res.status(400).json({ error: "Missing required feature_id" });
    }
    const { data, error } = await supabase
      .from("Feature")
      .delete()
      .eq("id", id)
      .select()
      .single();

    console.log("data", data);

    if (error) {
      console.error("Supabase error:", error);
      return res
        .status(500)
        .json({ error: "Database error", details: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Feature not found" });
    }

    console.log("Deleted feature:", data);
    res.status(200).json({ message: "Feature deleted successfully", data });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete feature", details: err.message });
  }
});
featuresRouter.get("/project/:projectId", async (req, res) => {
  try {
    console.log("project");
    const project_id = req.params.projectId;
    console.log(project_id);
    const { data, error } = await supabase
      .from("Feature")
      .select(`
        *,
        User(id, name)
      `)
      .eq("project_id", project_id)
      .order("updated_at", { ascending: false });

    console.log(data);
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to get feature", details: err.message });
  }
});

featuresRouter.get("/:feature_id", async (req, res) => {
  try {
    const id = req.params.feature_id;

    const { data, error } = await supabase
      .from("Feature")
      .select("*")
      .eq("id", id)
      .order("updated_at", { ascending: false });

    console.log(data);
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to get feature", details: err.message });
  }
});

module.exports = featuresRouter;
