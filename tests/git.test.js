const { createGitHandler, createAbletonRepo } = require('../services/git');
const { REPOSITORY_PATH, ARCHIVE_PATH } = require("../config/init");
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

// This test is to check the commit history and revert to a previous commit
// it works by checking the commit history and then reverting to a previous commit
// then checking if the commit hash matches the expected previous commit hash
// and also the files in the repository are reverted to the state of that commit
test('to revert to a previous commit', async () => {
  let songId = '1';
  const repo_path = path.join(REPOSITORY_PATH, songId); // Define repo_path here
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

  // Initialize git handler
  const gitHandler = await createGitHandler(repo_path);
  const git = simpleGit(repo_path);
  if (!gitHandler) {
      throw new Error("Failed to create git handler");
  }
  // Ensure the repository is initialized
  const isRepo = await git.checkIsRepo("root");
  expect(isRepo).toBeTruthy();

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

  //get the first commit hash
  const firstCommitHash = log.latest.hash;

  //modify the files
  const content2 = `Some different random text`;
  const promises2 = [];
  files.forEach(file => {
      const filePath = path.join(repo_path, file);
      promises2.push(fsp.writeFile(filePath, content2));
  })
  try {
      await Promise.all(promises2);
  } catch (e) {
      console.error("Failed to create files:", e);
      throw e;
  }

  const commitMessage2 = "Second commit";
  await gitHandler.commitAbletonUpdate(userId, commitMessage2, trackChanges);

  const log2 = await git.log();

  // Expects two commits
  expect(log2.all.length).toBe(2);
  expect(log2.latest).toBe(log2.all[0]);

  // Check commit metadata
  const commitMetadata2 = log2.latest;
  expect(commitMetadata2.message).toBe(commitMessage2);
  expect(commitMetadata2.author_name).toMatch(userId);

  // Check added files in commit
  const showOutput2 = await git.show();
  const regexp2 = /file[0-2]\.txt/g;
  const matchedFiles2 = [...new Set([...showOutput2.matchAll(regexp2)].map(match => match[0]))]
  expect(matchedFiles2.sort()).toEqual(files.sort());

  //revert to the first commit
  await git.checkout(firstCommitHash);

  //get the log after revert
  const log3 = await git.log();

  //check if the latest commit is the first commit
  expect(log3.latest.hash).toBe(firstCommitHash);

  //check if the files are reverted to the first commit
  const showOutput3 = await git.show();
  const regexp3 = /file[0-2]\.txt/g;
  const matchedFiles3 = [...new Set([...showOutput3.matchAll(regexp3)].map(match => match[0]))]
  expect(matchedFiles3.sort()).toEqual(files.sort());

  //check if the content of the files are reverted to the first commit
  const promises3 = [];
  files.forEach(file => {
      const filePath = path.join(repo_path, file);
      promises3.push(fsp.readFile(filePath, 'utf8'));
  })

  const contents = await Promise.all(promises3);
  contents.forEach(content => {
      expect(content).toBe(`Some random text`);
  })


})
afterAll(async () => {
    console.log('running afterAll');
    // Remove test directory
    await fsp.rm(REPOSITORY_PATH, { recursive: true });
    console.log('completed afterAll');
})

// Test getLatestCommitHash()
test('getLatestCommitHash returns the most recent commit hash', async () => {
    const songId = 'testSong';
    const repoPath = path.join(REPOSITORY_PATH, songId);

    await fsp.mkdir(repoPath, { recursive: true });
    await fsp.writeFile(path.join(repoPath, 'file.txt'), 'test content');

    const gitHandler = await createGitHandler(repoPath);
    await gitHandler.commitAbletonUpdate("11111111", "Test commit");

    const hash = await gitHandler.getLatestCommitHash();

    expect(hash).not.toBe("-1");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
});

  
  // Test createArchive()
  test('createArchive generates correct .zip file', async () => {
    const songId = 'testSong';
    const repoPath = path.join(REPOSITORY_PATH, songId);
    const archiveName = `${songId}.zip`;
    const archivePath = path.join(ARCHIVE_PATH, archiveName);

    await fsp.mkdir(repoPath, { recursive: true });
    await fsp.writeFile(path.join(repoPath, 'file.txt'), 'test content');

    const gitHandler = await createGitHandler(repoPath);
    await gitHandler.commitAbletonUpdate("11111111", "Archive commit");

    const hash = await gitHandler.getLatestCommitHash();
    const zipPath = await gitHandler.createArchive(hash);

    const stats = await fsp.stat(zipPath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);
});

// Test createGitHandler
test('createGitHandler initializes on non-repo dir with files', async () => {
    const songId = 'initWithFiles';
    const repoPath = path.join(REPOSITORY_PATH, songId);

    await fsp.mkdir(repoPath, { recursive: true });
    await fsp.writeFile(path.join(repoPath, 'dummy.txt'), 'dummy');

    const gitHandler = await createGitHandler(repoPath);
    const git = simpleGit(repoPath);
    const isRepo = await git.checkIsRepo("root");

    expect(isRepo).toBeTruthy();
});

// Test getLatestCommitHash for empty repo
test('getLatestCommitHash returns -1 for empty repo', async () => {
    const songId = 'emptyRepo';
    const repoPath = path.join(REPOSITORY_PATH, songId);

    await fsp.mkdir(repoPath, { recursive: true });
    const gitHandler = await createGitHandler(repoPath);
    
    const hash = await gitHandler.getLatestCommitHash();
    expect(hash).toBe("-1");
});


