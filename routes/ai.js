// filepath: /Users/Sooraj/local_projects/cs506/backend/routes/ai.js
const express = require('express');
const aiRouter = express.Router();
const { generateCommitMessage, getCommitStyleOptions } = require('../utils/llmCommitGenerator');

// Endpoint to generate a commit message
aiRouter.post('/generate-commit-message', async (req, res) => {
  try {
    const { diffSummary, options } = req.body;

    // Basic validation
    if (!diffSummary) {
      return res.status(400).json({ success: false, error: 'Missing diffSummary in request body' });
    }

    // The generateCommitMessage function expects an object with llmText property,
    // ensure the diffSummary object passed from the frontend contains this or adjust accordingly.
    // If diffSummary itself *is* the object expected by generateCommitMessage, use it directly.
    // If diffSummary is nested (e.g., req.body = { diffSummary: { llmText: '...' } }), adjust access.
    // Based on frontend code, it seems req.body is { diffSummary: ProjectDiff }
    // and generateCommitMessage expects { llmText: '...' }
    // Let's assume ProjectDiff might have an llmText field or similar summary text.
    // If not, trackComparison.js needs to add it, or this needs adjustment.
    // For now, assuming diffSummary *is* the object with llmText:
    const result = await generateCommitMessage(diffSummary, options || {});

    if (result.success) {
      res.json(result);
    } else {
      // If generateCommitMessage handled the error internally and returned success: false
      res.status(500).json(result);
    }
  } catch (error) {
    // Catch unexpected errors during the process
    console.error("Error in /generate-commit-message endpoint:", error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate commit message due to an internal server error.',
      commitMessage: 'Project update' // Fallback
    });
  }
});

// Endpoint to get available style options (optional, but good for frontend)
aiRouter.get('/commit-style-options', (req, res) => {
  try {
    const options = getCommitStyleOptions();
    res.json(options);
  } catch (error) {
    console.error("Error fetching commit style options:", error);
    res.status(500).json({ error: 'Failed to retrieve commit style options.' });
  }
});


module.exports = aiRouter;