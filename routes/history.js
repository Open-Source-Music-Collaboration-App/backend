//create endpoint to return all commits history of a project
const express = require('express');
const historyRouter = express.Router();
const path = require('path');
const fs = require('fs');

const { createGitHandler } = require("../services/git");
const { REPOSITORY_PATH, ARCHIVE_PATH } = require("../config/init");


historyRouter.post('/restore/:userId/:projectId/:commitHash', async (req, res) => {
  try {
    const { userId, projectId, commitHash } = req.params;
    const { message } = req.body;
    
    // Input validation
    if (!userId || !projectId || !commitHash) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const repoPath = path.join(REPOSITORY_PATH, projectId);
    const git = await createGitHandler(repoPath);
    
    // Create a new commit
    await git.restoreCommit(commitHash, userId, message || `Restored to version with hash: ${commitHash}`);

    
    res.status(200).json({ 
      message: "Version restored successfully", 
      projectId,
      userId
    });
    
  } catch (err) {
    console.error('Error restoring version:', err);
    res.status(500).json({ 
      error: 'Failed to restore version', 
      details: err.message 
    });
  }
});

// Get all commits history for a project
historyRouter.get('/all/:userId/:projectId', async (req, res) => {
  try {
    const { userId, projectId } = req.params;

    // console.log("Getting all commits");
    
    // Input validation
    if (!userId || !projectId) {
      return res.status(400).json({ error: 'Missing required parameters: userId and songId' });
    }

    const repoPath = path.join(REPOSITORY_PATH, projectId);
    const git = await createGitHandler(repoPath);

    // console.log("!!!Created git handler");
    if( await git.getLatestCommitHash() === "-1"){
      console.log("Repo is empty");
      return res.status(204).json({ error: "Repository is empty" });
    }

    // console.log(git.getLatestCommitHash());
    
    const history = await git.getAbletonVersionHistory();
    
    // Extract track changes from commit messages
    const historyWithChanges = history.all.map(commit => {
      // Parse track changes from commit message
      const trackChangesMatch = commit.message.match(/Track-Changes: (.+)$/s);
      let trackChanges = null;
      
      if (trackChangesMatch && trackChangesMatch[1]) {
        try {
          trackChanges = JSON.parse(trackChangesMatch[1]);
        } catch (e) {
          console.error('Failed to parse track changes:', e);
        }
      }
      
      return {
        ...commit,
        trackChanges
      };
    });
    
    res.status(200).json({ 
      projectId: projectId, 
      userId: userId, 
      history: {
        ...history,
        all: historyWithChanges
      }
    });
  } catch (err) {
    console.error('Error getting commit history:', err);
    res.status(500).json({ 
      error: 'Failed to retrieve commit history', 
      details: err.message 
    });
  }
});

//latest commit only
historyRouter.get('/latest/:userId/:projectId', async (req, res) => {
  console.log("GETTING LATEST COMMIT");
  const { userId, projectId } = req.params;
  // console.log(userId, projectId);
  
  const git = await createGitHandler(path.join(REPOSITORY_PATH, projectId));

  try {
    const latestCommitHash = await git.getLatestCommitHash();
    if( latestCommitHash === "-1"){
      return res.status(204).json({ error: "Repository is empty" });
    }
    const archivePath = await git.createArchive(latestCommitHash);
    //wait until archivePath is fully created before sending
    if( !fs.existsSync(archivePath)){
      console.log("File not found");
      return res.status(500).json({ error: "Failed to create archive" });
    }
    const output = fs.readFileSync(archivePath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${projectId}-${latestCommitHash}.zip`);
    res.send(output);
  } catch (err) {
    console.error('Error getting latest commit:', err);
    res.status(204).json({
      error: 'Repo is empty',
      details: err.message
    });
  }
})

/**
 * Returns the diff.json JSON file for a specific commit
 */
historyRouter.get('/diff/:userId/:projectId/:commitHash', async (req, res) => {
  const { userId, projectId, commitHash } = req.params;
  const git = await createGitHandler(path.join(REPOSITORY_PATH, projectId));

  try {
    const diffJSON = await git.getDiffJSON(commitHash);
    if (!diffJSON) {
      return res.status(404).json({ error: 'Diff data not found for the specified commit' });
    }
    // console.log(diffJSON);
    res.status(200).json(diffJSON);
  } catch (err) {
    console.error('Error fetching diff data:', err);
    res.status(500).json({ error: 'Failed to fetch diff data', details: err.message });
  }
});

historyRouter.get('/:userId/:projectId/:commitHash', async (req, res) => {
  const { userId, projectId, commitHash } = req.params;
  const git = await createGitHandler(path.join(REPOSITORY_PATH, projectId));

  const archivePath = await git.createArchive(commitHash);
  // console.log("HERE");
  res.sendFile(archivePath);
})

module.exports = historyRouter;