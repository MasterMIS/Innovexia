/**
 * OAuth Token Setup Script
 * 
 * This script helps you generate OAuth tokens for Google Drive access.
 * Run this ONCE to authorize the app and generate tokens.
 * 
 * Usage: node scripts/setup-oauth-tokens.js
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// OAuth credentials
const OAUTH_CREDENTIALS = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  redirect_uri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback"
};

if (!OAUTH_CREDENTIALS.client_id || !OAUTH_CREDENTIALS.client_secret) {
  console.error('\n❌ Missing Google OAuth credentials in .env.local');
  console.error('Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.\n');
  process.exit(1);
}

const TOKEN_PATH = path.join(process.cwd(), 'google-oauth-tokens.json');

// Scopes needed for Google Drive
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets'
];

async function setupOAuthTokens() {
  const oauth2Client = new google.auth.OAuth2(
    OAUTH_CREDENTIALS.client_id,
    OAUTH_CREDENTIALS.client_secret,
    OAUTH_CREDENTIALS.redirect_uri
  );

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force to get refresh token
  });

  console.log('\n========================================');
  console.log('Google Drive OAuth Setup');
  console.log('========================================\n');
  console.log('1. Make sure your Next.js dev server is running on http://localhost:3000\n');
  console.log('2. Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n3. Authorize the application');
  console.log('4. You will be redirected to a page with an authorization code');
  console.log('5. Copy the code and paste it below\n');

  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter the authorization code: ', async (code) => {
    rl.close();

    if (!code || code.trim() === '') {
      console.error('× No code provided. Exiting.');
      process.exit(1);
    }

    try {
      console.log('\n✓ Code received, exchanging for tokens...');

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code.trim());

      // Save tokens to file
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

      console.log('✓ Tokens saved to:', TOKEN_PATH);
      console.log('\n✅ Setup complete! You can now run: npm run dev\n');
      process.exit(0);

    } catch (error) {
      console.error('× Error getting tokens:', error.message);
      console.error('\nPlease make sure:');
      console.error('1. The authorization code is correct');
      console.error('2. The code hasn\'t expired (they expire quickly)');
      console.error('3. You\'ve added http://localhost:3000/api/auth/google/callback to Google Cloud Console\n');
      process.exit(1);
    }
  });
}

setupOAuthTokens().catch(console.error);
