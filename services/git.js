const { simpleGit } = require("simple-git");
const path = require('path');
const { REPOSITORY_PATH, ARCHIVE_PATH } = require("../config/init");
const { exec } = require("child_process");
const fs = require("fs");

// Single instance for handling git init within REPOSITORY_PATH dir
const gitBaseHandler = simpleGit();

/*
Initialize a git repository within REPOSITORY_PATH dir
*/
async function createAbletonRepo(userId, songId) {
    console.log("running createAbletonRepo")
    try {
        await gitBaseHandler.init([path.join(REPOSITORY_PATH, songId)])
        console.log("repo initialized")
    } catch (e) {
        console.log("repo init FAILED:", e);
    }
}

/**
 * Factory function for creating git handlers for repos within REPOSITORY_PATH dir
 * Will initialize repo if not initialized already
 * @param {*} basedir the directory to run commands in
 * @returns {Object} a git instance that within the basedir
 */
async function createGitHandler(basedir) {
    const git = simpleGit(basedir);
    const workingDir = basedir;
    const songId = path.basename(workingDir);
    /** 
    * Initialize basedir as a repository if not already
    * @returns Nothing
    */
    const initIfNotRepo = async () => {
        const isRepo = await git.checkIsRepo("root");
        console.log("IsRepo:", isRepo);
        if (isRepo) {
            return;
        }

        console.log("initializng repo");
        try {
            await git.init();
            console.log("repo initialized");
        } catch (e) {
            console.log("repo init FAILED:", e);
        }
    }

    /**
     * Git add all files and makes a commit in the main branch
     * @param {*} user name of user making commit
     * @param {*} user_id id of user making commit
     * @param {*} commitMessage Message that will be committed
     * @returns {void}
     */
    const commitAbletonUpdate = async (user, user_id, commitMessage, trackChanges = null) => {
        try {
            console.log('Adding');
            await git.add('.')
            console.log('Added');
        } catch (e) {
            console.log('git add FAILED', e);
            return;
        }

        try {
            // Store track changes in the commit message or in commit notes
            const message = trackChanges ?
                `${commitMessage}\n\nUser-ID: ${user_id}\n\nTrack-Changes: ${JSON.stringify(trackChanges)}` :
                `${commitMessage}\n\nUser-ID: ${user_id}`;

              

            console.log('Committing');
            await git.commit(message, { '--author': `${user} <>` });
            console.log('Committed');
        } catch (e) {
            console.log('git commit FAILED', e);
            return;
        }
    }


    /**
     * Returns log of main branch
     * @returns Object with git history
     */
    const getAbletonVersionHistory = async () => {
        const log = await git.log();
        console.log(log);
        return log;
    }

    /**
     * Returns the latest commit hash
     * @returns Commit hash
     */

    const getLatestCommitHash = async () => {
        console.log("Getting latest commit hash");


        //check if repo is empty
        if (fs.readdirSync(workingDir).length === 1) {
            console.log("Repo is empty");
            return "-1";
        }

        try {
            console.log("!!!Getting log");
            const log = await git.log();
            // console.log(log); 
            // console.log(log.latest.hash);
            return log.latest.hash;
        }
        catch (e) {
            console.log("Failed git log:", e);
            return "-1";
        }

        return "-1";
    }

    /**
     * Creates a ZIP archive of the files from a specified commit using git archive.
     * @param {*} hash Commit hash
     * @returns Path to archive
     */
    const createArchive = async (hash) => {
        try {
            const objType = await git.catFile(['-t', hash]);
            if (objType.trim() !== 'commit') {
                return;
            }
        } catch (e) {
            console.log("Failed git cat-file:", e);
            return null;
        }

        const archiveName = `${songId}-${hash}.zip`;
        const outputPath = path.resolve(ARCHIVE_PATH, archiveName);
        const command = `git archive --format=zip -o ${outputPath} ${hash}`;
        return new Promise((resolve, reject) => {
            exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
                if (error) {
                    console.log('exec for git archive error:', error);
                    reject(error);
                    return;
                }

                console.log('Created archive');
                resolve(outputPath);
            })
        })

    }


    /**
     * Returns the diff.json contents in a given commit
     * 
     * @param {*} hash Commit hash
     * @returns diff.json contents stored in the commit
     */
    const getDiffJSON = async (commitHash) => {
        const objType = await git.catFile(['-t', commitHash]);
        if (objType.trim() !== 'commit') {
            return;
        }

        try {
            const diffJson = await git.show([`${commitHash}:diff.json`]);
            return JSON.parse(diffJson);
        } catch (e) {
            console.log("Failed to get diff.json:", e);
            return null;
        }
    }
        
    /**
     * Restores working directory to the state in the specified commit
     * Revert all changes from <hash>..HEAD
     * @param {*} startHash - the hash to revert to
     * @param {*} userId - the id associated with owner
     * @param {String} message - the message for commit
     */
    const restoreCommit = async (startHash, userId, message) => {
        try {
            console.log(startHash)
            const objType = await git.catFile(['-t', startHash]);
            if (objType.trim() !== 'commit') {
                return;
            }
        } catch (e) {
            console.log("Failed git cat-file:", e);
            return;
        }

        try {
            console.log('Reverting');

            await git.raw('revert', `${startHash}..HEAD`, '--no-commit');

        } catch (e) {
            console.log('git revert failed:', e);
            return;
        }

        try {
            console.log('Commiting revert');
            await git.commit(message, { '--author': `${userId} <>` });
        } catch (e) {
            console.log('git commit failed');
        }



    }

    await initIfNotRepo();

    return {
        commitAbletonUpdate, getAbletonVersionHistory, createArchive, getLatestCommitHash, restoreCommit, getDiffJSON
    }
}

module.exports = {
    createGitHandler,
    createAbletonRepo,
};

