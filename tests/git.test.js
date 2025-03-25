const { createGitHandler, createAbletonRepo } = require('../services/git');
const { REPOSITORY_PATH } = require("../config/init");
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('path');
const { simpleGit } = require('simple-git');

async function clearDirectory() {
    // Remove all directories
    const files = fs.readdirSync(REPOSITORY_PATH, { withFileTypes: true });
    if (files.length != 0) {
        await Promise.all(files.map(file => fsp.rm(path.join(REPOSITORY_PATH, file.name), { recursive: true })))
    }
}

/**
 * One time setup to ensure REPOSITORY_PATH exists
 */
beforeAll(async () => {
    console.log('running beforeAll');
    // Ensure test directory exists
    if (!fs.existsSync(REPOSITORY_PATH)) {
        fs.mkdirSync(REPOSITORY_PATH, { recursive: true });
    }

    await clearDirectory();
    console.log('completed beforeAll');
})

/**
 * Only test createAbletonRepo(userId, songId)
 */
describe('creating', () => {
    let userId = 11111111;

    beforeEach(async () => {
        await clearDirectory();
    })

    test('single ableton repo', async () => {
        let songId = "1";
        await createAbletonRepo(userId, songId);
        const repo_path = path.join(REPOSITORY_PATH, songId);

        const doesExists = fs.existsSync(repo_path);
        expect(doesExists).toBeTruthy();

        const git = simpleGit(repo_path);
        const isRepo = await git.checkIsRepo("root");
        expect(isRepo).toBeTruthy();

    })

    test('multiple ableton repo sequentially', async () => {
        const max_repos = 5
        let songId;

        for (let i = 1; i < max_repos; i++) {
            songId = String(i);
            await createAbletonRepo(userId, songId);

            let repo_path = path.join(REPOSITORY_PATH, String(i))
            const doesExists = fs.existsSync(repo_path);
            expect(doesExists).toBeTruthy();

            const git = simpleGit(repo_path);
            const isRepo = await git.checkIsRepo("root");
            expect(isRepo).toBeTruthy();
        }
    })

    test('multiple ableton repo concurrently', async () => {
        const max_repos = 5
        let songId;
        
        const promises = []
        for (let i = 1; i < max_repos; i++) {
            songId = String(i);
            promises.push(createAbletonRepo(userId, songId));
        }
        await Promise.all(promises);

        for (let i = 1; i < max_repos; i++) {
            let repo_path = path.join(REPOSITORY_PATH, String(i))
            const doesExists = fs.existsSync(repo_path);
            expect(doesExists).toBeTruthy();

            const git = simpleGit(repo_path);
            const isRepo = await git.checkIsRepo("root");
            expect(isRepo).toBeTruthy();
        }
    })

    afterAll(async() => {
        await clearDirectory();
    })
})


afterAll(async () => {
    console.log('running afterAll');
    // Remove test directory
    await fsp.rm(REPOSITORY_PATH, { recursive: true });
    console.log('completed afterAll');
})