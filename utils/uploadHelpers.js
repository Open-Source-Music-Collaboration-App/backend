const busboy = require("busboy");
const fs = require("fs");
const path = require("path");
const { UPLOAD_PATH, REPOSITORY_PATH } = require("../config/init");
const { exec } = require("child_process");
const { createGitHandler } = require("../services/git");
const { compareTrackChanges } = require('../utils/trackComparison');

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

    // Rename "blob" -> "metadata.json" if desired
    if (filename === "blob") {
      filename = "metadata.json";
    }

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


    // If you're sending jsonData as a single blob field:
    if (fieldname === "jsonData") {
      try {
        jsonData = JSON.parse(value);
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON format" });
      }
    }
  });

  bb.on("finish", () => {

    if (!files.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    //read blob file in uploads folder and parse into userId, projectId, commitMessage
    const blobFilePath = path.join(UPLOAD_PATH, "metadata.json");
    if (fs.existsSync(blobFilePath)) {
      try {
        const blobContent = fs.readFileSync(blobFilePath, "utf8");
        const blobData = JSON.parse(blobContent);
        let { userId, projectId, commitMessage } = blobData;

        //exec parseAbleton.py ..uploads/<proj>.als ../utils/repo/repository/userId/projectId
        console.log("Parsed blob data:", { userId, projectId, commitMessage });
        //exec parseAbleton.py ..uploads/<proj>.als ../utils/repo/repository/userId/projectId
        const pythonScriptPath = path.join(__dirname, "../utils/parseAbleton.py");
        const alsFilePath = path.join(UPLOAD_PATH);
        const repoPath = path.join(REPOSITORY_PATH, projectId);

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

        console.log("Executing command:", command);
        exec(command, async (error, stdout, stderr) => {
          if (error) {
            console.error("Error executing script:", error);
            return;
          }
          console.log("Script output:", stdout);
          console.error("Script error output:", stderr);

          const repoPath = path.join(REPOSITORY_PATH, projectId);
          const git = await createGitHandler(repoPath);


          // Get current ableton_project.json
          const currentJsonPath = path.join(repoPath, 'ableton_project.json');
          const currentJson = fs.readFileSync(currentJsonPath, 'utf8');

          // Compare versions and detect changes
          let trackChanges = null;
          if (previousJson) {
            trackChanges = compareTrackChanges(previousJson, currentJson);
          }

          fs.copyFileSync(alsFileSrcPath, alsFileDestPath);
          git.commitAbletonUpdate(userId, commitMessage, trackChanges);
        });

        res.status(201).json({
          message: "Files uploaded successfully",
          files,
          jsonData,
        });



      } catch (err) {
        console.error("Error reading blob file:", err);
      }
    }

  });
  return bb;
}


module.exports = createConfiguredBusBoy;