const busboy = require("busboy");
const fs = require("fs");
const path = require("path");
const { UPLOAD_PATH, REPOSITORY_PATH } = require("../config/init");
const { createGitHandler } = require("../services/git");
const { compareTrackChanges, getDetailedProjectDiff } = require('../utils/trackComparison');
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

/**
 * 
 * @param {*} req the HTTP request object 
 * @param {*} res the HTTP response object 
 * @param {*} onFinish callback for finish event
 */
const createConfiguredBusBoy = (req, res) => {
  const bb = busboy({ headers: req.headers });
  let files = [];
  let jsonData = {};

  bb.on("file", (fieldname, fileStream, fileInfo) => {
    let { filename, encoding, mimeType } = fileInfo;
    console.log("Receiving file:", filename);

    // Collect file data in memory
    const chunks = [];
    fileStream.on("data", (chunk) => {
      chunks.push(chunk);
    });

    fileStream.on("end", () => {
      const fileBuffer = Buffer.concat(chunks);

      // Write the file **synchronously** to disk
      const savePath = path.join(UPLOAD_PATH, filename);
      fs.writeFileSync(savePath, fileBuffer);

      files.push({ fieldname, filename, encoding, mimeType, savePath });

    });
  });

  bb.on("field", (fieldname, value) => {
    jsonData[fieldname] = value;
  });

  bb.on("finish", async () => {

    if (!files.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    let { userId, projectId, commitMessage } = jsonData;
    if (!userId || !projectId) {
      return res.status(400).json({
        error: "Missing required metadata:",
        userId: userId,
        projectId: projectId
      })
    }

    //exec parseAbleton.py ..uploads/<proj>.als ../utils/repo/repository/userId/projectId
    const pythonScriptPath = path.join(__dirname, "../utils/parseAbleton.py");
    const alsFilePath = path.join(UPLOAD_PATH);
    const repoPath = path.join(REPOSITORY_PATH, projectId);
    try {
      // copy the als file to the repo path it ends with .als
      const alsFileName = files.find(file => file.filename.endsWith('.als')).filename;
      const alsFileSrcPath = path.join(UPLOAD_PATH, alsFileName);
      const alsFileDestPath = path.join(repoPath, alsFileName);

      const command = `python3 ${pythonScriptPath} ${alsFilePath} ${repoPath}`;

      //before executing the command, store the current ableton_project.json
      const previousJsonPath = path.join(repoPath, 'ableton_project.json');
      let previousJson = null;
      if (fs.existsSync(previousJsonPath)) {
        previousJson = fs.readFileSync(previousJsonPath, 'utf8');
      }

      try {
        const { stdout, stderr } = await exec(command);
        console.log('Script output:', stdout);
        console.log('Script error output:', stderr);
      } catch (error) {
        console.log('Error executing script:', error);
        res.status(500).json({
          message: "Error executing parser script",
          files,
          jsonData,
        })
      }
      const git = await createGitHandler(repoPath);

      fs.copyFileSync(alsFileSrcPath, alsFileDestPath);
      // Get current ableton_project.json
      const currentJsonPath = path.join(repoPath, 'ableton_project.json');
      const currentJson = fs.readFileSync(currentJsonPath, 'utf8');

      // Compare versions and detect changes
      let trackChanges = null;
      if (previousJson) {
        trackChanges = compareTrackChanges(previousJson, currentJson);

        const detailedDiff = getDetailedProjectDiff(previousJson, currentJson);
        console.log("Detailed project diff:", detailedDiff);
        const diffFilePath = path.join(repoPath, 'diff.json');
        fs.writeFileSync(diffFilePath, JSON.stringify(detailedDiff, null, 2));
        console.log("Detailed diff saved to:", diffFilePath);
      }


      git.commitAbletonUpdate(userId, commitMessage, trackChanges);
      res.status(201).json({
        message: "Files uploaded successfully",
        files,
        jsonData,
      });
    } catch (err) {
      console.error("Error:", err);
      res.status(500).json({
        message: err,
        files,
        jsonData,
      })
    }

  });
  return bb;
}


module.exports = createConfiguredBusBoy;