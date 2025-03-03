const fs = require("fs");
const path = require("node:path");
const { initGit } = require("../services/git");

const REPOSITORY_PATH = path.join(".", "tmp", "repositories");
const UPLOAD_PATH = path.join(".", "tmp", "uploads");

const init = () => {
    if (!fs.existsSync(UPLOAD_PATH)) {
        fs.mkdirSync(UPLOAD_PATH, { recursive: true });
    }

    if (!fs.existsSync(REPOSITORY_PATH)) {
        fs.mkdirSync(REPOSITORY_PATH, { recursive: true })
    }
}

module.exports = {
    REPOSITORY_PATH,
    UPLOAD_PATH,
    init
}