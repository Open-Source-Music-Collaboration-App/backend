const express = require("express");
const commentsRouter = express.Router();
const supabase = require("../services/supabase");

// Add a comment to a feature
commentsRouter.post("/", async (req, res) => {
  try {
    const {
      feature_id,
      author_id,
      message,
    } = req.body;

    console.log("Received request body:", req.body);

    if (!feature_id || !author_id || !message) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        details: "feature_id, author_id, and message are required" 
      });
    }

    const { data, error } = await supabase
      .from("Comment")
      .insert({
        feature_id: feature_id,
        author_id: author_id,
        message: message,
      })
      .select(`
        *,
        User(id, name)
      `)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return res
        .status(500)
        .json({ error: "Database error", details: error.message });
    }
    
    console.log("Created comment:", data);
    res.status(201).json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create comment", details: err.message });
  }
});

// Delete a comment
commentsRouter.delete("/:comment_id", async (req, res) => {
  try {
    const id = req.params.comment_id;

    if (!id) {
      return res.status(400).json({ error: "Missing required comment_id" });
    }
    
    const { data, error } = await supabase
      .from("Comment")
      .delete()
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
      return res.status(404).json({ error: "Comment not found" });
    }

    console.log("Deleted comment:", data);
    res.status(200).json({ message: "Comment deleted successfully", data });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete comment", details: err.message });
  }
});

// Get all comments for a feature
commentsRouter.get("/feature/:feature_id", async (req, res) => {
  try {
    const feature_id = req.params.feature_id;
    
    const { data, error } = await supabase
      .from("Comment")
      .select(`
        *,
        User(id, name)
      `)
      .eq("feature_id", feature_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      return res
        .status(500)
        .json({ error: "Database error", details: error.message });
    }

    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to get comments", details: err.message });
  }
});

module.exports = commentsRouter;