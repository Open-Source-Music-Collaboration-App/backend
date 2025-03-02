# Music Collaboration Platform Backend

This is an Express.js server for the CS506 Open Source Music Collaboration Project. It provides APIs for authentication, project management, audio file uploads, and version control for Ableton projects.

## Table of Contents

1. Project Overview
2. Setup and Installation
3. Environment Variables
4. API Documentation
   - Authentication
   - Projects
   - File Upload
   - Audio
5. Repository Structure
6. Core Components
7. Database Schema
8. Development
9. Troubleshooting

## Project Overview

This backend server facilitates collaboration on music projects, specifically for Ableton Live projects. It offers:
- GitHub authentication
- Project management with metadata
- File uploads for Ableton projects and audio files
- Version control for Ableton projects
- Audio comparison capabilities

## Setup and Installation

1. **Clone the repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a .env file in the root directory with the required environment variables (see below).

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Environment Variables

Create a .env file with the following variables:

```
PORT=3333
SESSION_SECRET=your_session_secret_here
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key
```

## API Documentation

### Authentication

#### GitHub OAuth Authentication

- **Route**: `GET /auth/github`
- **Description**: Initiates GitHub OAuth flow
- **Response**: Redirects to GitHub for authentication

#### GitHub OAuth Callback

- **Route**: `GET /auth/github/callback`
- **Description**: Callback URL for GitHub OAuth
- **Response**: Redirects to frontend dashboard on successful authentication

#### Logout

- **Route**: `GET /auth/logout` or `/logout`
- **Description**: Logs out the current user
- **Response**: Clears the session cookie and returns success message

#### Authentication Check

- **Route**: `GET /api/me`
- **Description**: Checks if the user is authenticated
- **Response**: User data if authenticated, 401 if not

### Projects

#### Create Project

- **Route**: `POST /api/projects`
- **Body**: 
  ```json
  {
    "userId": "string",
    "title": "string",
    "hashtags": ["string"]
  }
  ```
- **Response**: Created project data

#### Get User Projects

- **Route**: `GET /api/projects?owner_id=userId`
- **Query Parameters**: `owner_id` - User ID
- **Response**: List of projects owned by the user

#### Get Project by ID

- **Route**: `GET /api/projects/:projectId`
- **Response**: Project data including user name

#### Get Project Files

- **Route**: `GET /api/projects/:id/files`
- **Response**: List of files in the project repository

#### Upload Files to Project

- **Route**: `POST /api/projects/:id/upload`
- **Body**: Form data with `file` field
- **Response**: Acknowledgement of receipt

### File Upload

#### Upload Files

- **Route**: `POST /api/upload`
- **Body**: Multipart form data with files and optional metadata JSON
- **Response**: Success message with file details

### Audio

#### Compare Audio Files

- **Route**: `POST /api/audio/compare`
- **Description**: Compares two WAV files for similarity
- **Response**: Similarity score

## Repository Structure

```
├── app.js                  # Main application setup
├── config/                 # Configuration files
│   └── supabase.js         # Supabase client configuration
├── index.js                # Entry point
├── middlewares/            # Express middleware functions
├── routes/                 # API routes
│   ├── audio.js            # Audio comparison routes
│   ├── authentication.js   # Authentication routes
│   ├── projects.js         # Project management routes
│   └── upload.js           # File upload routes
├── uploads/                # Permanent upload storage
└── utils/                  # Utility functions
    ├── audioComparison.js  # Audio comparison logic
    ├── createOrGetUser.js  # User creation/fetching utility
    ├── parseAbleton.py     # Python script to parse Ableton projects
    ├── passport.js         # Passport.js authentication setup
    └── repo/               # Repository management tools
        ├── repositories/   # Git repositories for projects
        └── repoTools.js    # Git operations utilities
```

## Core Components

### app.js

Main Express.js application configuration with middleware and route setup. Configures CORS, session management, and authentication.

### index.js

Entry point that starts the Express server on the configured port.

### routes/

#### authentication.js

Handles GitHub OAuth authentication flow. Uses Passport.js for authentication and redirects users to the frontend dashboard after successful login.

#### projects.js

Manages CRUD operations for projects. Projects are stored in Supabase and can be associated with files in the repository.

#### upload.js

Processes file uploads using Busboy. Supports Ableton project files and audio files, and triggers the Python parser for Ableton projects.

#### audio.js

Provides audio comparison functionality to determine similarity between WAV files.

### utils/

#### createOrGetUser.js

Creates a new user in the database or returns an existing user. Used during authentication to ensure a user record exists.

#### parseAbleton.py

Python script that parses Ableton Live project files (.als) and extracts track information, including:
- Track details (name, volume, etc.)
- MIDI events and notes
- Audio clip placements
- Audio file references

Also matches and moves WAV files to the appropriate project folder.

```bash
python3 utils/parseAbleton.py test.als ./output-folder
   ```
  This outputs ableton_project.json and tracks/*.wav where ableton_project.json contains all information about the music project including, track data, track volume, track MIDI events, MIDI notes, MIDI note occurences with velocity, Audio track occurences.

#### repoTools.js

Manages Git repositories for version control of Ableton projects. Provides functions to:
- Create repositories
- Commit changes
- Retrieve version history

## Database Schema

The application uses Supabase as the database and includes the following tables:

### User Table

Stores user information from GitHub authentication.

### Project Table

Stores project metadata including:
- Title
- Owner (user_id)
- Hashtags
- Creation and update timestamps

## Development

To start the development server with hot reloading:

```bash
npm run dev
```

## Troubleshooting

### File Upload Issues

If file uploads aren't working:

1. Ensure the files and uploads directories exist and have proper permissions
2. Check the request format (must be multipart/form-data)

### Authentication Issues

If GitHub authentication isn't working:

1. Verify your GitHub OAuth application settings
2. Check that the callback URL matches exactly
3. Ensure all environment variables are correctly set
4. Check for CORS issues if the frontend is on a different origin

---
