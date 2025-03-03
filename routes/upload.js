const express = require("express");
const busboy = require("busboy");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { UPLOAD_PATH, REPOSITORY_PATH } = require("../config/init")

const uploadRouter = express.Router();

uploadRouter.post("/", (req, res) => {
  // Call busboy() as a function:
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
        const command = `python3 ${pythonScriptPath} ${alsFilePath} ${repoPath}`;
        console.log("Executing command:", command);
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error("Error executing script:", error);
            return;
          }
          console.log("Script output:", stdout);
          console.error("Script error output:", stderr);
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

  req.pipe(bb);
});

module.exports = uploadRouter;