const express = require("express");
const busboy = require("busboy");
const fs = require("fs");
const path = require("path");
const { UPLOAD_PATH } = require("../config/init");
const createConfiguredBusBoy = require("../utils/uploadHelpers");


const uploadRouter = express.Router();


uploadRouter.post("/", (req, res) => {
 
  // Call busboy() as a function:
  const bb = createConfiguredBusBoy(req, res);
  
  //remove all files in UPLOAD_PATH folder  
  try {
    const files = fs.readdirSync(UPLOAD_PATH);
    for (const file of files) {
      // Skip directories named "previews"
      if (file === "previews") continue;

      fs.unlinkSync(path.join(UPLOAD_PATH, file));
    }
    console.log("Cleaned up upload directory");
  } catch (err) {
    console.error("Error cleaning up upload directory:", err);
  }
  
  
  req.pipe(bb);
});

module.exports = uploadRouter;