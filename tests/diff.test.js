
const {compareTrackChanges, getDetailedProjectDiff} = require('../utils/trackComparison');
const fs = require('fs');
const path = require('path');
const ableton_project_v1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'ableton_project_v1.json')));
const ableton_project_v2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'ableton_project_v2.json')));
const { UPLOAD_PATH, REPOSITORY_PATH } = require("../config/init"); 
const { exec } = require('child_process');

const util = require('util');
const execPromise = util.promisify(exec);



describe("using diff handler", () => {
    
  test("compare ableton projects", async () => {
      const diff = await getDetailedProjectDiff(ableton_project_v1, ableton_project_v2);
      expect(diff).toBeDefined();
      //print the diff
      console.log(diff);
  });
});

describe("testing parseAbleton.py", () => {
  // Set up test directories and files
  const testProjectId = 'test-project-' + Date.now();
  const testRepoPath = path.join(REPOSITORY_PATH, testProjectId);
  const pythonScriptPath = path.join(__dirname, '../utils/parseAbleton.py');
  const sampleAlsFile = path.join(__dirname, 'assets', 'test_project.als');
  
  beforeAll(() => {
    // Create test directories if they don't exist
    if (!fs.existsSync(testRepoPath)) {
      fs.mkdirSync(testRepoPath, { recursive: true });
    }
    
    // Check if test ALS file exists
    if (!fs.existsSync(sampleAlsFile)) {
      console.warn(`Warning: Sample ALS file not found at ${sampleAlsFile}`);
      console.warn('Some tests will be skipped. Place a test Ableton project file at this location.');
    }
  });
  
  afterAll(() => {
    // Clean up test directories after tests
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true });
    }
  });
  
  test("parseAbleton.py executes and generates ableton_project.json", async () => {
    // Skip test if no sample ALS file
    if (!fs.existsSync(sampleAlsFile)) {
      console.log('Skipping test due to missing sample ALS file');
      return;
    }
    
    // Copy the test ALS file to the upload path
    const uploadDir = path.join(UPLOAD_PATH);
    const alsFilename = path.basename(sampleAlsFile);
    const alsFileCopy = path.join(uploadDir, alsFilename);
    
    // Create UPLOAD_PATH if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Copy the ALS file
    fs.copyFileSync(sampleAlsFile, alsFileCopy);
    
    try {
      // Execute the Python script
      const command = `python3 ${pythonScriptPath} ${uploadDir} ${testRepoPath}`;
      const { stdout, stderr } = await execPromise(command);
      
      // Check if script executed successfully
      console.log('Script output:', stdout);
      if (stderr) console.error('Script errors:', stderr);
      
      // Check if ableton_project.json was created
      const projectJsonPath = path.join(testRepoPath, 'ableton_project.json');
      expect(fs.existsSync(projectJsonPath)).toBe(true);
      
      // Validate the JSON structure
      const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
      expect(projectJson).toHaveProperty('project');
      expect(projectJson).toHaveProperty('tracks');
      expect(Array.isArray(projectJson.tracks)).toBe(true);
      
      // Validate the structure of tracks
      if (projectJson.tracks.length > 0) {
        const firstTrack = projectJson.tracks[0];
        expect(firstTrack).toHaveProperty('id');
        expect(firstTrack).toHaveProperty('name');
        expect(firstTrack).toHaveProperty('type');
      }
      
    } catch (error) {
      console.error('Test execution error:', error);
      throw error;
    } finally {
      // Clean up the copied ALS file
      if (fs.existsSync(alsFileCopy)) {
        fs.unlinkSync(alsFileCopy);
      }
    }
  });
});
