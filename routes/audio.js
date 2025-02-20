const express = require("express");
const wavDecoder = require("wav-decoder");
const fs = require("fs");
const { compareWavFiles } = require("../services/audioComparison");

const audioRouter = express.Router();

audioRouter.post("/compare", async (req, res) => {
  try {
    // Read and decode WAV files
    const file1 = null; // TODO: read files from backend
    const file2 = null; // TODO: read files from backend

    const similarity = compareWavFiles(file1, file2);

    res.json({ similarity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = audioRouter;
