// tests/env.test.js
// Simple test to verify environment variables are available

require('dotenv').config();


describe('Environment Variables', () => {
  test('GitHub OAuth credentials are available', () => {
    console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID);
    console.log('GITHUB_CLIENT_SECRET length:', process.env.GITHUB_CLIENT_SECRET ? process.env.GITHUB_CLIENT_SECRET.length : 0);
    
    expect(process.env.GITHUB_CLIENT_ID).toBeDefined();
    expect(process.env.GITHUB_CLIENT_SECRET).toBeDefined();
    expect(process.env.SESSION_SECRET).toBeDefined();
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE).toBeDefined();
  });
});
