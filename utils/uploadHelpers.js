const busboy = require("busboy");
const fs = require("fs");
const path = require("path");
const { UPLOAD_PATH, REPOSITORY_PATH, ABLETON_PARSER_PATH, COLLABORATION_STORAGE_PATH } = require("../config/init");
const { createGitHandler } = require("../services/git");
const { compareTrackChanges, getDetailedProjectDiff } = require("../utils/trackComparison");
const { exec } = require("child_process");
const util = require("util");
const { UploadAction} = require("../constants/action");
const supabase = require("../services/supabase");
const execPromise = util.promisify(exec);

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
      console.log("File saved to:", savePath);

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
    let { userId, projectId, commitMessage, actionType, title } = jsonData;
    if (!userId || !projectId || !Object.values(UploadAction).includes(actionType)) {
      return res.status(400).json({
        error: "Missing required metadata:",
        userId: userId ?? "undefined",
        projectId: projectId ?? "undefined",
        actionType: actionType ?? "undefined",
      })
    }

    const { data, error } = await supabase
      .from('User')
      .select("*")
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      return res.status(500).json({
        message: "Error fetching user from Supabase",
        error,
      });
    }

    if (!data) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const username = data['name']

    //exec parseAbleton.py ..uploads/<proj>.als ../utils/repo/repository/userId/projectId
    const alsFilePath = path.join(UPLOAD_PATH);
    let collabId;
    let repoPath;
    if (actionType == UploadAction.COMMIT) {
      repoPath = path.join(REPOSITORY_PATH, projectId)
    } else {

      const { data, error } = await supabase
        .from('Collab')
        .insert([
          {
            project_id: projectId,
            author_id: userId,
            title: title ?? `Collaboration request from ${userId}`,
            description: commitMessage
          },
        ])
        .select()
        .single();
      if (error) {
        return res.status(500).json({
          message: "Error creating collaboration in Supabase",
          error,
        });
      }

      console.log(data);
      collabId = data.id;

      repoPath = path.join(COLLABORATION_STORAGE_PATH, collabId.toString());
    }
    try {
      // copy the als file to the repo path it ends with .als
      const alsFileName = files.find(file => file.filename.endsWith('.als')).filename;
      const alsFileSrcPath = path.join(UPLOAD_PATH, alsFileName);
      const alsFileDestPath = path.join(repoPath, alsFileName);

      const command = `python3 ${ABLETON_PARSER_PATH} ${alsFilePath} ${repoPath}`;

      //before executing the command, store the current ableton_project.json
      const previousJsonPath = path.join(repoPath, 'ableton_project.json');
      let previousJson = null;
      if (fs.existsSync(previousJsonPath)) {
        previousJson = fs.readFileSync(previousJsonPath, 'utf8');
      }

      try {
        const { stdout, stderr } = await execPromise(command);
        console.log('Script output:', stdout);
        console.log('Script error output:', stderr);
      } catch (error) {
        console.log('Error executing script:', error);
        res.status(500).json({
          message: "Error executing parser script",
          files,
          jsonData,
        })
        return;
      }

      console.log("Ableton project parsed successfully");


      // Get current ableton_project.json
      const currentJsonPath = path.join(repoPath, 'ableton_project.json');
      const currentJson = fs.readFileSync(currentJsonPath, 'utf8');

      // Copy the ALS file to the repository folder regardless of changes
      fs.copyFileSync(alsFileSrcPath, alsFileDestPath);
      if (actionType == UploadAction.COLLAB_REQ) {
        return res.status(201).json({
          message: "Collaboration request created successfully",
          collaborationId: collabId
        });
      }
      // Compare versions and detect changes
      let trackChanges = null;
      let isFirstCommit = false;

      if (previousJson) {
        trackChanges = compareTrackChanges(previousJson, currentJson);
      } else {
        // This is the first commit, we should proceed regardless
        isFirstCommit = true;
        console.log("First commit detected - no previous JSON to compare.");
      }

      // Proceed with commit if there are changes OR if this is the first commit
      const hasChanges = trackChanges &&
        (trackChanges.added.length > 0 ||
          trackChanges.modified.length > 0 ||
          trackChanges.removed.length > 0);

      if (hasChanges || isFirstCommit) {
        // If changes detected, get detailed project diff
        let detailedDiff = null;
        if (previousJson) {
          detailedDiff = getDetailedProjectDiff(previousJson, currentJson);
          console.log("Detailed project diff:", detailedDiff);

          //create a file called diff.json in the repoPath
          const diffFilePath = path.join(repoPath, 'diff.json');
          fs.writeFileSync(diffFilePath, JSON.stringify(detailedDiff, null, 2));
          console.log("Detailed diff saved to:", diffFilePath);
        }

        // Make the commit
        const git = await createGitHandler(repoPath);
        await git.commitAbletonUpdate(username, userId, commitMessage, trackChanges);

        res.status(201).json({
          message: "Files uploaded successfully",
          files,
          jsonData,
        });
      } else {
        console.log("No changes detected in the project.");
        return res.status(200).json({
          message: "No changes detected, no commit made.",
          files,
          jsonData,
        });
      }
    }
    catch (err) {
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