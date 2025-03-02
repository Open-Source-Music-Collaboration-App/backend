const { simpleGit } = require("simple-git");

let git;

const createGitInstance = (basedir) => {
    git = simpleGit(basedir);
}

const getGitInstance = () => git;

module.exports = {
    createGitInstance, getGitInstance
}