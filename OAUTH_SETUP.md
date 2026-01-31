# OAuth Setup Guide

This application has been migrated from Google Service Account credentials to OAuth2 authentication. This provides better security and user-based access control.

## OAuth Credentials

The following OAuth credentials are configured:
- **Client ID**: `430034328922-uccvqtfdn5hfog0j47f9d95uva13ibkh.apps.googleusercontent.com`
- **Project ID**: `clean-yew-483214-s7`

## Setup Instructions

### 1. Generate OAuth Tokens

Before running the application, you need to generate OAuth tokens:

```bash
node scripts/setup-oauth-tokens.js
```

This script will:
1. Open your browser with a Google authorization URL
2. Ask you to authorize the application
3. Redirect to `http://localhost:3001/api/auth/google/callback`
4. Automatically capture the authorization code and generate tokens
5. Save the tokens to `google-oauth-tokens.json`

### 2. Verify Tokens

To check if your tokens are valid:

```bash
node scripts/check-oauth-tokens.js
```

This will display:
- Token status (present/missing)
- Expiration time
- Whether the token needs refresh

### 3. Run the Application

Once tokens are generated, start the application:

```bash
npm run dev
```

## Token Management

- **Automatic Refresh**: The OAuth client automatically refreshes access tokens when they expire
- **Token Storage**: Tokens are stored in `google-oauth-tokens.json` (not committed to git)
- **Token Scopes**: The application requests these scopes:
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/drive`
  - `https://www.googleapis.com/auth/spreadsheets`

## Files Modified

The following files have been updated to use OAuth instead of service account credentials:

- **lib/oauth.ts** - New centralized OAuth configuration and token management
- **lib/sheets.ts** - Google Sheets API client now uses OAuth
- **lib/drive.ts** - Google Drive API client now uses OAuth
- **app/api/mom/route.ts** - MOM API route uses OAuth
- **app/api/lead-to-sales/route.ts** - Lead-to-sales API route uses OAuth
- **scripts/setup-oauth-tokens.js** - Updated with new OAuth credentials

## Troubleshooting

### Tokens not found error
Run the setup script to generate tokens:
```bash
node scripts/setup-oauth-tokens.js
```

### Expired tokens
The application will automatically refresh expired access tokens using the refresh token. If the refresh token is invalid, re-run the setup script.

### Authorization errors
Make sure the Google account you're using has access to:
- The Google Sheets spreadsheets
- The Google Drive folders

### Port already in use
If port 3001 is already in use, stop any running processes on that port before running the setup script.

## Security Notes

- **Never commit** `google-oauth-tokens.json` to version control
- The `.gitignore` file should include `google-oauth-tokens.json`
- OAuth tokens provide user-level access, which is more secure than service account credentials
- Tokens can be revoked from your Google account settings at any time
