//create endpoint to return all commits history of a project
const express = require('express');
const historyRouter = express.Router();
const path = require('path');

const { createGitHandler } = require("../services/git");
const { REPOSITORY_PATH, ARCHIVE_PATH } = require("../config/init");

// Get all commits history for a project
historyRouter.get('/all/:userId/:projectId', async (req, res) => {


  try {
    const { userId, projectId } = req.params;
    
    
    // Input validation
    if (!userId || !projectId) {
      return res.status(400).json({ error: 'Missing required parameters: userId and songId' });
    }

    const repoPath = path.join(REPOSITORY_PATH, projectId);
    const git = await createGitHandler(repoPath);
    
    const history = await git.getAbletonVersionHistory();
    
    if (!history || history.error) {
      return res.status(404).json({ 
        error: 'Could not retrieve commit history',
        details: history?.error || 'Repository may not exist or has no commits'
      });
    }
    
    res.status(200).json({ 
      projectId: projectId, 
      userId: userId, 
      history: history 
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
  const { userId, projectId } = req.params;
  const git = await createGitHandler(path.join(REPOSITORY_PATH, projectId));

  const latestCommitHash = await git.getLatestCommitHash();
  if (latestCommitHash === "-1") {
    return res.status(204).json({ error: "Repository is empty" });
  }
  const archivePath = await git.createArchive(latestCommitHash);
  res.sendFile(archivePath);
})

historyRouter.get('/:userId/:projectId/:commitHash', async (req, res) => {
  const { userId, projectId, commitHash } = req.params;
  const git = await createGitHandler(path.join(REPOSITORY_PATH, projectId));

  const archivePath = await git.createArchive(commitHash);
  console.log("HERE");
  res.sendFile(archivePath);
})

module.exports = historyRouter;