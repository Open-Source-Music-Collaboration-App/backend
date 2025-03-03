const { simpleGit } = require("simple-git");
const path = require('path');
const { REPOSITORY_PATH } = require("../config/init");

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

/*
Factory function for creating git handlers for repos within REPOSITORY_PATH dir
Will initialize repo if not initialized already
*/
async function createGitHandler(basedir) {
    const git = simpleGit(basedir);
    /*
    Initialize basedir as a repository if not already
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

    const commitAbletonUpdate = async (userId, songId, commitMessage) => {
        try {
            console.log('Adding');
            await git.add('.')
            console.log('Added');
        } catch (e) {
            console.log('git add FAILED', e);
            return;
        }

        try {
            console.log('Committing');
            await git.commit(commitMessage);
            console.log('Committed');
        } catch (e) {
            console.log('git commit FAILED', e);
            return;
        }
    }



    const getAbletonVersionHistory = (userId, songId) => {

    }
    await initIfNotRepo();

    return {
        commitAbletonUpdate, getAbletonVersionHistory
    }
}

module.exports = {
    createGitHandler,
    createAbletonRepo
};

