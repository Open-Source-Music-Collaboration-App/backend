# /utils
This directory contains utility functions and tools that support the backend functionality of the Music Collaboration Platform.

## Overview

The utils directory houses standalone utilities, scripts, and configuration that provide essential functionality to the application, including:

- Authentication setup
- User management
- Audio processing
- Repository management
- Ableton project parsing

## Files and Components

### 1. passport.js

Configures GitHub OAuth authentication using Passport.js.

#### Functions and Setup:
- Initializes GitHub OAuth strategy with client ID, secret, and callback URL from environment variables
- Implements user serialization and deserialization for session management
- Exports configured passport instance for use in the main application

#### Usage:
```js
const passport = require("./utils/passport");
app.use(passport.initialize());
app.use(passport.session());
```

### 2. createOrGetUser.js

Manages user creation and retrieval in the Supabase database.

#### Functions:
- `createOrGetUser(userId, username)`: Creates a new user if they don't exist or retrieves existing user data

#### Parameters:
- `userId`: String - Unique identifier for the user (from GitHub OAuth)
- `username`: String - User's display name

#### Returns:
- Promise resolving to an object with either `data` (user object) or `error` property

#### Usage:
```js
const result = await createOrGetUser(id.toString(), username);
if (result.error) {
  // Handle error
} else {
  // Use result.data
}
```

### 3. parseAbleton.py

Python script for parsing Ableton Live project files (.als) into JSON representation.

#### Functionality:
- Extracts track information from Ableton projects (MIDI and Audio tracks)
- Parses MIDI notes, velocities, and event timing
- Identifies and processes audio clips
- Matches and organizes WAV files that correspond to each track
- Outputs structured JSON with track data

#### Usage:
```bash
python3 utils/parseAbleton.py path/to/project.als ./output-folder
```

#### Output:
- Creates ableton_project.json with detailed project structure
- Creates `tracks/` directory with organized WAV files

### 4. audioComparison.js

Provides utilities for comparing audio files for similarity.

#### Functions:
- Planned implementation for WAV file comparison and similarity detection
- Currently a placeholder for future audio analysis functionality

### 5. repoTools.js

Manages Git repositories for version control of Ableton projects.

#### Functions:
- `createAbletonRepo(userId, songId)`: Creates a new repository for a user's song
- `commitAbletonUpdate(userId, songId, commitMessage)`: Commits changes to a repository
- `getAbletonVersionHistory(userId, songId)`: Retrieves version history for a song

#### Repository Structure:
Each repository is stored under `utils/repo/repositories/{userId}/{songId}/` and contains:
- ableton_project.json: Structured project data
- `tracks/`: Directory containing WAV files for each track

## Dependencies

- Node.js fs and path modules
- child_process (for executing commands)
- @supabase/supabase-js
- passport and passport-github2
- Python 3.x with XML parsing capabilities

## Best Practices

1. **Error Handling**: All utility functions implement try-catch blocks and return standardized error objects
2. **Configuration**: Sensitive configuration is loaded from environment variables
3. **File Management**: Temporary files are cleaned up after processing
4. **Modularity**: Each utility focuses on a specific responsibility

## Troubleshooting

### Python Script Issues

If the Python parser isn't working:

1. Ensure Python 3.x is installed and in PATH
2. Check file permissions for the script
3. Verify XML structure is as expected (script is designed for Ableton 11)

### Repository Management Issues

If repository operations fail:

1. Ensure the repository directory structure exists
2. Check file permissions for the directories
3. Verify Git is installed on the system

### Authentication Issues

If authentication utilities aren't working:

1. Verify environment variables for GitHub OAuth are set correctly
2. Check Supabase connection and credentials

## Future Improvements

- Implement full audio comparison functionality in audioComparison.js
- Add support for different Ableton project versions in parseAbleton.py
- Implement more robust error handling and logging
- Add unit tests for utility functions