import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// OAuth2 credentials
export const OAUTH_CREDENTIALS = {
  client_id: process.env.GOOGLE_CLIENT_ID!,
  client_secret: process.env.GOOGLE_CLIENT_SECRET!,
  redirect_uri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback"
};

const TOKEN_PATH = path.join(process.cwd(), 'google-oauth-tokens.json');

// Read tokens from file
function readTokens() {
  try {
    if (!fs.existsSync(TOKEN_PATH)) {
      throw new Error('OAuth tokens not found. Please run: node scripts/setup-oauth-tokens.js');
    }
    const data = fs.readFileSync(TOKEN_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading OAuth tokens:', error);
    throw error;
  }
}

// Save tokens to file
function saveTokens(tokens: any) {
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('Error saving OAuth tokens:', error);
    throw error;
  }
}

// Get authenticated OAuth2 client
export async function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    OAUTH_CREDENTIALS.client_id,
    OAUTH_CREDENTIALS.client_secret,
    OAUTH_CREDENTIALS.redirect_uri
  );

  // Read tokens from file
  const tokens = readTokens();
  oauth2Client.setCredentials(tokens);

  // Set up automatic token refresh
  oauth2Client.on('tokens', (newTokens) => {
    if (newTokens.refresh_token) {
      // Save the new refresh token
      saveTokens({ ...tokens, ...newTokens });
    } else {
      // Save just the access token
      saveTokens({ ...tokens, ...newTokens });
    }
  });

  return oauth2Client;
}

// Get Google Sheets API client with OAuth
export async function getGoogleSheetsClient() {
  const auth = await getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

// Get Google Drive API client with OAuth
export async function getGoogleDriveClient() {
  const auth = await getOAuth2Client();
  const drive = google.drive({ version: 'v3', auth });
  return drive;
}
