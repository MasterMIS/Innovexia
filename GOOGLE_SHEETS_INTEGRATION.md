# Google Sheets Integration Guide - Service Account Setup

This guide explains how the application has been integrated with Google Sheets using a Service Account (not OAuth).

## Overview

The application now uses Google Sheets API with Service Account authentication to store and retrieve data directly from your Google Spreadsheets. This approach is simpler than OAuth and doesn't require user authorization.

## Service Account Details

**Email:** `test1-334@inlaid-index-466017-j8.iam.gserviceaccount.com`
**Project:** `inlaid-index-466017-j8`

The service account credentials are securely stored in:
- [lib/sheets.ts](lib/sheets.ts) - For Google Sheets operations
- [lib/drive.ts](lib/drive.ts) - For Google Drive file uploads

## Spreadsheet Structure

### Delegation Spreadsheet
**ID:** `1bUhEVfY7kVGUFT9jtzDylpvRqWiOvjdqR70OXL1AuA8`

Contains 3 sheets:

#### 1. `delegation` Sheet
Main delegation records with columns:
- id, user_id, delegation_name, description, assigned_to, doer_name
- department, priority, due_date, status, voice_note_url
- reference_docs (JSON), evidence_required, created_at, updated_at

#### 2. `delegation_remarks` Sheet
Comments on delegations:
- id, delegation_id, user_id, username, remark, created_at

#### 3. `delegation_revision_history` Sheet
Status change tracking:
- id, delegation_id, old_status, new_status, old_due_date, new_due_date, reason, created_at

## Google Drive Folders

The service account also has access to Google Drive folders for file uploads:

- **Delegation Docs:** `1IH4wziT0GqAHmfT9_MJv9P7v7oo5ueVb`
- **User Images:** `19W5H8CwUgenQAUIefZYOf4G5G8Lam-9G`
- **Chat Docs:** `1FlLZw3LVkMqk-loSq8Rxza95zOcpNWIt`

**Note:** Yes, you can organize these folders and the service account will have access to all folders/spreadsheets you share with it!

## Granting Access to Spreadsheets and Folders

**IMPORTANT:** You must share each spreadsheet and folder with the service account:

### Step 1: Share the Delegation Spreadsheet
1. Open: https://docs.google.com/spreadsheets/d/1bUhEVfY7kVGUFT9jtzDylpvRqWiOvjdqR70OXL1AuA8
2. Click "Share" button
3. Add: `test1-334@inlaid-index-466017-j8.iam.gserviceaccount.com`
4. Set permissions to **Editor**
5. Uncheck "Notify people"
6. Click "Share"

### Step 2: Share Google Drive Folders
Repeat for each folder:
1. Open the folder in Google Drive
2. Right-click → Share
3. Add: `test1-334@inlaid-index-466017-j8.iam.gserviceaccount.com`
4. Set permissions to **Editor**
5. Uncheck "Notify people"
6. Click "Share"

**Tip:** You can organize all your spreadsheets and folders in a parent folder and just share that parent folder with the service account. The service account will automatically have access to everything inside!

## Testing

1. Start development server:
   ```bash
   npm run dev
   ```

2. Visit: http://localhost:3000/delegation

3. Try creating, viewing, and managing delegations

4. Check your Google Sheet to see data being stored in real-time

## How It Works

- **Data Storage:** Each row = one record, first row = headers
- **ID Generation:** Auto-incremented based on row count
- **Complex Data:** Objects/arrays stored as JSON strings
- **Timestamps:** ISO format with IST offset applied
- **No Caching:** Direct API calls for real-time data

## Troubleshooting

| Error | Solution |
|-------|----------|
| 403 Forbidden | Share spreadsheet/folder with service account email |
| 404 Not Found | Verify spreadsheet ID is correct |
| Sheet not found | Create sheets with exact names: `delegation`, `delegation_remarks`, `delegation_revision_history` |
| Data not saving | Check service account has Editor permissions |

## Benefits of Service Account vs OAuth

✅ **No user authorization required** - Works automatically  
✅ **No token expiration** - Credentials never expire  
✅ **Simpler setup** - Just share once and forget  
✅ **No refresh token management** - Always authenticated  
✅ **Works in production** - No redirect URLs needed  

## Security Note

The service account private key is stored in your code. For production:
- Consider using environment variables
- Ensure your repository is private
- Never commit credentials to public repos
- Rotate keys periodically in Google Cloud Console
