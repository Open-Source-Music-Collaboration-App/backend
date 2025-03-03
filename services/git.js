const { simpleGit } = require("simple-git");

class Git {
    constructor(basedir) {
        this.git = simpleGit(basedir);
    }

    async createAbletonRepo(userId, songId) {
        console.log("running createAbletonRepo")
        try {
            await this.git.init([`${songId}`])
            console.log("repo initialized")
        } catch (e) {
            console.log("repo init FAILED:", e);
        }
    }

    async commitAbletonUpdate(userId, songId, commitMessage) {
        try {
            console.log('Adding');
            await this.git.add('.')
            console.log('Added');
        } catch (e) {
            console.log('git add FAILED', e);
        }
        
        try {
            console.log('Committing');
            await this.git.commit(commitMessage);
            console.log('Committed');
        } catch (e) {
            console.log('git commit FAILED', e);
        }
    }

    getAbletonVersionHistory(userId, songId) {

    }
}

module.exports = Git;

