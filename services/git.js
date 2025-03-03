const { simpleGit } = require("simple-git");

class Git {
    constructor(basedir) {
        this.git = simpleGit(basedir);
    }

    async createAbletonRepo(userId, songId) {
        console.log('createAlbetonRepo:', this.git);
        await this.git.init([`${songId}`])
    }

    commitAbletonUpdate(userId, songId, commitMessage) {

    }

    getAbletonVersionHistory(userId, songId) {

    }
}

module.exports = Git;

