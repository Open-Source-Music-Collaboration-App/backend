const express = require("express");
const collaborationRouter = express.Router();
const supabase = require("../services/supabase");
const path = require("node:path");
const { REPOSITORY_PATH, COLLABORATION_STORAGE_PATH } = require("../config/init");
const { createGitHandler } = require("../services/git");
const fs = require("fs");
const fsPromises = fs.promises;
const { CollabReqStatus } = require("../constants/action");
const { compareTrackChanges, getDetailedProjectDiff } = require("../utils/trackComparison");


collaborationRouter.post('/:collab_id', async (req, res) => {
    const collabId = req.params.collab_id;
    const { action } = req.body;

    // Ensure valid aciton
    if (!Object.values(CollabReqStatus).includes(action)) {
        return res.status(400).json({
            message: "Invalid action",
        })
    }

    // Ensure collaboration request exists
    let { data: retrieveData, error: retrieveError } = await supabase
        .from('Collab')
        .select("project_id, description, author_id, User (name)")
        .eq('id', collabId)
        .maybeSingle()
    if (retrieveError) {
        return res.status(500).json({
            message: "Error fetching collaboration from Supabase",
            retrieveError,
        })
    }

    if (!retrieveData) {
        return res.status(404).json({
            message: "Collaboration request not found",
        })
    }

    const { project_id, description, author_id, User: { name: user } } = retrieveData;

    const src = path.join(COLLABORATION_STORAGE_PATH, collabId.toString());
    const dest = path.join(REPOSITORY_PATH, project_id.toString());
    let files;
    if (action == CollabReqStatus.ACCEPTED) {



        // Read the ableton JSON file from the source directory before clearing directory
        const newJsonPath = path.join(src, 'ableton_project.json');
        const oldJsonPath = path.join(dest, 'ableton_project.json');
        let oldJson = null;
        if (fs.existsSync(oldJsonPath)) {
            oldJson = fs.readFileSync(oldJsonPath, 'utf8');
        }

        try {
            files = fs.readdirSync(dest);
        } catch (error) {
            return res.status(500).json({
                message: "Error reading destination folder",
                error,
            })
        }

        try {
            const promises = [];
            files.forEach(file => {
                if (file === '.git') {
                    return;
                }

                const filePath = path.join(dest, file);
                promises.push(fsPromises.rm(filePath, {
                    recursive: true,
                    force: true
                }
                ));
            })

            await Promise.all(promises);
        } catch (error) {
            return res.status(500).json({
                message: "Error deleting files in destination folder",
                error,
            })
        }

        try {
            // Copy files from src to dest
            fs.cpSync(src, dest, {
                recursive: true,
            });
        } catch (error) {
            return res.status(500).json({
                message: "Error copying files to destination folder",
                error,
            })
        }

        if (oldJson) {
            const newJson = fs.readFileSync(newJsonPath, 'utf8');
            trackChanges = compareTrackChanges(oldJson, newJson);
            detailedDiff = getDetailedProjectDiff(oldJson, newJson);
            const diffFilePath = path.join(dest, 'diff.json');
            fs.writeFileSync(diffFilePath, JSON.stringify(detailedDiff, null, 2));
        }

        // Create git handler
        const git = await createGitHandler(dest);
        // await gitHandler.
        await git.commitAbletonUpdate(user, description, trackChanges)
    }


    // Update db
    let { data: _, error: updateErr } = await supabase
        .from('Collab')
        .update({ status: action })
        .eq('id', collabId)
    if (updateErr) {
        return res.status(500).json({
            message: "Error updating collaboration from Supabase",
            updateErr,
        })
    }




    return res.status(200).json({
        message: `Collaboration request status: ${action}`,
        files
    })


})
module.exports = collaborationRouter;