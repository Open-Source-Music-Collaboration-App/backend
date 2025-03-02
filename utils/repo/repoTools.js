const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function createAbletonRepo(userId, songId) {
    const repoPath = path.join(__dirname, "repositories", userId, songId);

    if (!fs.existsSync(repoPath)) {
        fs.mkdirSync(repoPath, { recursive: true });
        execSync("git init", { cwd: repoPath });
        execSync("git lfs install", { cwd: repoPath });
        execSync(`git lfs track "tracks/*.wav"`, { cwd: repoPath });  // Track all WAV files
        execSync("git add .gitattributes", { cwd: repoPath });
        execSync('git commit -m "Initialize Ableton project tracking"', { cwd: repoPath });
        console.log(`Repository created for Ableton project: ${songId}`);
    } else {
        console.log("Repository already exists.");
    }

    return repoPath;
}

function commitAbletonUpdate(userId, songId, commitMessage) {
  const repoPath = path.join(__dirname, "repositories", userId, songId);

  try {
      execSync("git add .", { cwd: repoPath });  // Add all changes
      execSync(`git commit -m "${commitMessage}"`, { cwd: repoPath });
      console.log("Ableton project version committed.");
  } catch (error) {
      console.error("Error committing update:", error);
  }
}

function getAbletonVersionHistory(userId, songId) {
  const repoPath = path.join(__dirname, "repositories", userId, songId);

  try {
      const history = execSync('git log --pretty=format:"%h - %an: %s"', { cwd: repoPath }).toString();
      return history.split("\n"); // Return as an array
  } catch (error) {
      console.error("Error getting version history:", error);
      return [];
  }
}

module.exports = {
    createAbletonRepo,
    commitAbletonUpdate,
    getAbletonVersionHistory
};


