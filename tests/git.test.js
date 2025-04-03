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

    afterAll(async () => {
        await clearDirectory();
    })
})

describe('using git handler', () => {
    let songId = '1';
    const repo_path = path.join(REPOSITORY_PATH, songId);
    let gitHandler; // our simpleGit wrapper
    let git; // raw simpleGit obj
    beforeAll(async () => {
        if (fs.existsSync(repo_path)) {
            fs.rmdirSync(repo_path, { recursive: true });
        }
        fs.mkdirSync(repo_path, { recursive: true });
        gitHandler = await createGitHandler(repo_path);

        git = simpleGit(repo_path);
    })

    test('verify that repo is initialized', async () => {
        const isRepo = await git.checkIsRepo("root");
        expect(isRepo).toBeTruthy();
    })

    test('to make an initial commit', async () => {
        // Set up files to stage and commit
        const content = `Some random text`;
        const promises = [];
        const files = Array.from({ length: 3 }, (_, i) => `file${i}.txt`);
        files.forEach(file => {
            const filePath = path.join(repo_path, file);
            promises.push(fsp.writeFile(filePath, content));
        })
        try {
            await Promise.all(promises);
        } catch (e) {
            console.error("Failed to create files:", e);
            throw e;
        }

        const userId = "11111111";
        const commitMessage = "Init commit";
        const trackChanges = null;

        await gitHandler.commitAbletonUpdate(userId, commitMessage, trackChanges);

        const log = await git.log();

        // Expects a single commit
        expect(log.all.length).toBe(1);
        expect(log.latest).toBe(log.all[0]);

        // Check commit metadata
        const commitMetadata = log.latest;
        expect(commitMetadata.message).toBe(commitMessage);
        expect(commitMetadata.author_name).toMatch(userId);

        // Check added files in commit
        const showOutput = await git.show();
        const regexp = /file[0-2]\.txt/g;
        const matchedFiles = [...new Set([...showOutput.matchAll(regexp)].map(match => match[0]))]
        expect(matchedFiles.sort()).toEqual(files.sort());
        
    })
})

test('to revert to a previous commit', async () => {
  // Get commit history
  const history = await gitHandler.getCommitHistory();
  const targetCommit = history[1].hash; // Second most recent commit
  
  // Revert to that commit
  await gitHandler.revertToCommit(targetCommit);
  
  // Check that the file created in the latest commit is now gone
  const newFileExists = fs.existsSync(path.join(repo_path, "newfile.txt"));
  expect(newFileExists).toBeFalsy();
  
  // But files from earlier commits should still exist
  const oldFileExists = fs.existsSync(path.join(repo_path, "file0.txt"));
  expect(oldFileExists).toBeTruthy();
})

afterAll(async () => {
    console.log('running afterAll');
    // Remove test directory
    await fsp.rm(REPOSITORY_PATH, { recursive: true });
    console.log('completed afterAll');
})