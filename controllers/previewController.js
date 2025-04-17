// filepath: backend/controllers/previewController.js
const fs = require('fs');
const path = require('path');
const { UPLOAD_PATH, REPOSITORY_PATH } = require('../config/init');
const { getDetailedProjectDiff } = require('../utils/trackComparison');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

exports.handlePreviewDiff = async (req, res) => {
    const { projectId } = req.params;
    const alsFile = req.file; // Uploaded via multer

    if (!alsFile) {
        return res.status(400).json({ message: 'No ALS file provided for preview.' });
    }

    const repoPath = path.join(REPOSITORY_PATH, projectId);
    const previousJsonPath = path.join(repoPath, 'ableton_project.json');
    const pythonScriptPath = path.join(__dirname, '../utils/parseAbleton.py');
    // Use a unique temporary directory within previews for parsing results
    const tempParseDir = path.join(UPLOAD_PATH, 'previews', `parsed-${projectId}-${Date.now()}`);
    const tempJsonPath = path.join(tempParseDir, 'ableton_project.json');
    const tempAlsPath = alsFile.path; // Path where multer saved the temp file

    console.log(`Starting preview for project ${projectId} with file ${tempAlsPath}`);

    try {
        // Ensure temporary parse directory exists
        if (!fs.existsSync(tempParseDir)) {
            fs.mkdirSync(tempParseDir, { recursive: true });
            console.log(`Created temporary parse directory: ${tempParseDir}`);
        }

        // 1. Check for existing project JSON in the main repository
        let previousJson = null;
        if (fs.existsSync(previousJsonPath)) {
            previousJson = fs.readFileSync(previousJsonPath, 'utf8');
            console.log(`Found previous JSON at ${previousJsonPath}`);
        } else {
            console.log(`Preview: No previous JSON found at ${previousJsonPath}, likely first upload.`);
        }

        // 2. Parse the temporarily uploaded ALS file
        // The python script expects the *directory containing the ALS file* and the *output directory*.
        const tempAlsDir = path.dirname(tempAlsPath); // Directory where multer saved the file
        const parseCommand = `python3 "${pythonScriptPath}" "${tempAlsDir}" "${tempParseDir}" --skip-audio-match`;
        console.log(`Executing preview parse command: ${parseCommand}`);

        try {
             const { stdout, stderr } = await execPromise(parseCommand);
             console.log('Preview Script stdout:', stdout);
             if (stderr) {
                console.warn('Preview Script stderr:', stderr); // Log stderr but don't necessarily fail
             }
             // Check if the expected JSON file was created
             if (!fs.existsSync(tempJsonPath)) {
                // Attempt to read stderr again if available, or provide a generic error
                const errorOutput = stderr || "Unknown parsing error";
                throw new Error(`Parsing failed: ${tempJsonPath} not created. Output: ${errorOutput}`);
             }
             console.log(`Parsing successful, generated ${tempJsonPath}`);
        } catch (error) {
             console.error('Error executing preview script:', error);
             // Clean up temporary file and dir before sending error
             if (fs.existsSync(tempAlsPath)) fs.unlinkSync(tempAlsPath);
             if (fs.existsSync(tempParseDir)) fs.rmSync(tempParseDir, { recursive: true, force: true });
             return res.status(500).json({ message: "Error parsing ALS file for preview.", details: error.message });
        }

        // 3. Read the newly generated JSON from the temporary location
        const currentJson = fs.readFileSync(tempJsonPath, 'utf8');

        // 4. Generate Diff (only if a previous version exists)
        let detailedDiff = null;
        let isFirstCommitPreview = !previousJson; // Flag if no previous version was found

        if (previousJson) {
            detailedDiff = getDetailedProjectDiff(previousJson, currentJson);
            console.log("Preview detailed project diff generated.");
        } else {
             console.log("Skipping diff generation as no previous version exists.");
             // Optionally, create a "diff" representing the initial state if needed by frontend
             // detailedDiff = createInitialStateRepresentation(currentJson);
        }

        // 5. Send Response
        res.status(200).json({
            message: "Preview generated successfully",
            diff: detailedDiff,
            isFirstCommitPreview: isFirstCommitPreview
        });

    } catch (error) {
        console.error("Error generating preview diff:", error);
        res.status(500).json({ message: "Failed to generate preview diff.", details: error.message });
    } finally {
        // 6. Cleanup temporary files/folders associated with this request
        console.log(`Cleaning up temporary files: ${tempAlsPath}, ${tempParseDir}`);
        if (fs.existsSync(tempAlsPath)) {
            try { fs.unlinkSync(tempAlsPath); } catch (e) { console.error(`Error deleting temp ALS file ${tempAlsPath}:`, e); }
        }
         if (fs.existsSync(tempParseDir)) {
             try { fs.rmSync(tempParseDir, { recursive: true, force: true }); } catch (e) { console.error(`Error deleting temp parse dir ${tempParseDir}:`, e); }
         }
    }
};