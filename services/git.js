const { simpleGit } = require("simple-git");

let git;

const initGit = (basedir) => {
    console.log('initGit:', git);
    git = simpleGit(basedir);
}

async function createAbletonRepo(userId, songId) {
    console.log('createAlbetonRepo:', git);
    await git.init([`${songId}`])
}

function commitAbletonUpdate(userId, songId, commitMessage) {
  
}

function getAbletonVersionHistory(userId, songId) {

}

module.exports = {
    initGit,
    createAbletonRepo,
    commitAbletonUpdate,
    getAbletonVersionHistory
};

