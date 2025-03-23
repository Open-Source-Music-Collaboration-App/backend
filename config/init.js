const fs = require("fs");
const path = require("node:path");
const { initGit } = require("../services/git");
require('dotenv').config()

const REPOSITORY_PATH = process.env.NODE_ENV !== 'test'
  ? path.resolve(".", "tmp", "repositories")
  : path.resolve(".", "tmp", "test_repositories");
const UPLOAD_PATH = path.resolve(".", "tmp", "uploads");
const ARCHIVE_PATH = path.resolve(".", "tmp", "archives");
const FEATURE_PATH = path.resolve(".", "tmp", "features");

const init = () => {
  if (!fs.existsSync(UPLOAD_PATH)) {
    fs.mkdirSync(UPLOAD_PATH, { recursive: true });
  }

  if (!fs.existsSync(REPOSITORY_PATH)) {
    fs.mkdirSync(REPOSITORY_PATH, { recursive: true });
  }

  if (!fs.existsSync(ARCHIVE_PATH)) {
    fs.mkdirSync(ARCHIVE_PATH, { recursive: true });
  }

  if (!fs.existsSync(FEATURE_PATH)) {
    fs.mkdirSync(FEATURE_PATH, { recursive: true });
  }
};

module.exports = {
  REPOSITORY_PATH,
  UPLOAD_PATH,
  ARCHIVE_PATH,
  FEATURE_PATH,
  init,
};

