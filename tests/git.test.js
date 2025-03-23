const { createGitHandler, createAbletonRepo } = require('../services/git');
const { REPOSITORY_PATH, ARCHIVE_PATH } = require("../config/init");
const fs = require('fs');
const path = require('path');

/**
 * One time setup to ensure REPOSITORY_PATH exists
 */
beforeAll(() => {
    // Ensure test directory exists
    if (fs.existsSync(REPOSITORY_PATH)) {
        fs.mkdirSync(REPOSITORY_PATH, { recursive: true });
    }


})

test('create ableton repo', async () => {
    const userId = 11111111;
    const songId = "1";
    await createAbletonRepo(userId, songId);

    const result = fs.existsSync(path.join(REPOSITORY_PATH, songId));
    expect(result).toBeTruthy();
})