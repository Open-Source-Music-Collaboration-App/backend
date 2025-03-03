const { simpleGit } = require("simple-git");

class Git {
    constructor(basedir) {
        this.git = simpleGit(basedir);
    }

    async createAbletonRepo(userId, songId) {
        console.log('createAlbetonRepo:', this.git);
        await this.git.init([`${songId}`])
    }

    async commitAbletonUpdate(userId, songId, commitMessage) {
        try {
            console.log('📂 Current working directory:', this.git);
            console.log('Adding');
            await this.git.add('.')
            console.log('Added');
            console.log('Committing');
            await this.git.commit(commitMessage);
            console.log('Committed');
        } catch (err) {
            console.log(err);
        }
    }

    getAbletonVersionHistory(userId, songId) {

    }
}

module.exports = Git;

