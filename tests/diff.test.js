
const {compareTrackChanges, getDetailedProjectDiff} = require('../utils/trackComparison');
const {generateCommitMessage, callOpenAI} = require('../utils/llmCommitGenerator');
const fs = require('fs');
const path = require('path');
const ableton_project_v1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'ableton_project_v1.json')));
const ableton_project_v2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'ableton_project_v2.json')));

describe("using diff handler", () => {
    
  test("compare ableton projects", async () => {
      const diff = await getDetailedProjectDiff(ableton_project_v1, ableton_project_v2);
      expect(diff).toBeDefined();
      //print the diff
      console.log(diff);

      let commitOptions = {
          detailLevel: 'moderate',
          tone: 'neutral',
          length: 'medium',
          focus: 'balanced'
      };
      
      const commitMessage = await generateCommitMessage(diff, commitOptions);
      expect(commitMessage).toBeDefined();
      //print the commit message
      console.log(commitMessage);
      expect(commitMessage.success).toBeTruthy();
  });
});
