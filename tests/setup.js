// tests/setup.js
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Log environment variables for debugging
console.log('Environment loaded in Jest setup:');
console.log('- GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID ? 'Defined' : 'Undefined');
console.log('- GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET ? 'Defined' : 'Undefined');
console.log('- SESSION_SECRET:', process.env.SESSION_SECRET ? 'Defined' : 'Undefined');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Defined' : 'Undefined');
