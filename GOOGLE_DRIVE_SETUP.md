# Google Drive File Upload Setup

## Overview
The application now saves all delegation voice notes and attachments to **Google Drive** instead of local storage.

## What's Implemented

### Features:
- ✅ Voice notes uploaded to Google Drive
- ✅ Reference documents uploaded to Google Drive  
- ✅ Files are publicly accessible via Google Drive links
- ✅ Automatic file permission management
- ✅ Support for images, audio files, PDFs, and documents

### Files Modified:
- `app/api/upload/route.ts` - Upload endpoint now uses Google Drive
- `lib/drive.ts` - New helper library for Google Drive operations

---

## Setup Instructions

### Step 1: Create a Google Drive Folder

1. Go to [Google Drive](https://drive.google.com)
2. Sign in with the same Google account used for the Service Account (test1-334@inlaid-index-466017-j8.iam.gserviceaccount.com)
3. Create a new folder named "Delegation Files" (or any name you prefer)
4. Open the folder
5. Copy the **Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/1234567890ABCDEFGH
                                            ^^^^^^^^^^^^^^^^^^
                                            This is your Folder ID
   ```

### Step 2: Share Folder with Service Account

1. Right-click the folder and select **Share**
2. Add the service account email: `test1-334@inlaid-index-466017-j8.iam.gserviceaccount.com`
3. Give it **Editor** permissions
4. Click **Send**

### Step 3: Update the Folder ID in Code

Open `lib/drive.ts` and replace the placeholder Folder ID:

```typescript
// Line 46
export const GOOGLE_DRIVE_FOLDER_ID = 'YOUR_ACTUAL_FOLDER_ID_HERE';
```

---

## How It Works

### File Upload Flow:

1. **User uploads file** (voice note or document) in the delegation form
2. **File is validated** (type and size)
3. **File is uploaded to Google Drive** in the specified folder
4. **Public link is generated** and stored in Google Sheets
5. **File can be accessed** via the stored URL

### File Access:

Files are made publicly accessible with these URLs:

- **View URL**: `https://drive.google.com/uc?export=view&id=FILE_ID`
- **Download URL**: `https://drive.google.com/uc?export=download&id=FILE_ID`

### Supported File Types:

**Images**: JPEG, PNG, GIF, WebP  
**Audio**: MP3, WAV, WebM, OGG  
**Documents**: PDF, DOC, DOCX

**Max File Size**: 10 MB

---

## API Endpoint

### POST `/api/upload`

**Request**: multipart/form-data with file
```javascript
const formData = new FormData();
formData.append('file', fileBlob);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});
```

**Response**:
```json
{
  "success": true,
  "url": "https://drive.google.com/uc?export=view&id=...",
  "downloadUrl": "https://drive.google.com/uc?export=download&id=...",
  "fileId": "1234567890ABCDEFGH",
  "fileName": "1234567890_recording.mp3",
  "mimeType": "audio/mpeg",
  "message": "File uploaded successfully to Google Drive"
}
```

---

## Helper Functions in `lib/drive.ts`

### Upload File
```typescript
import { uploadToDrive } from '@/lib/drive';

const result = await uploadToDrive(buffer, fileName, mimeType);
// Returns: { fileId, publicUrl, downloadUrl, fileName }
```

### Delete File
```typescript
import { deleteFromDrive } from '@/lib/drive';

await deleteFromDrive(fileId);
```

### List Files in Folder
```typescript
import { listDriveFiles } from '@/lib/drive';

const files = await listDriveFiles(folderId);
```

---

## Security Notes

⚠️ **Important**: The service account private key is currently hardcoded in the code. For production:

1. Move credentials to environment variables:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=...
   GOOGLE_PRIVATE_KEY=...
   GOOGLE_PROJECT_ID=...
   ```

2. Update the code to use `process.env` variables

3. Add `.env.local` to `.gitignore` to prevent exposing credentials

---

## Troubleshooting

### Error: "Permission denied"
- Make sure you shared the folder with the service account email
- Give it Editor or Owner permissions

### Error: "Folder not found"
- Double-check the Folder ID in `lib/drive.ts`
- Make sure the folder exists and is accessible

### Error: "File too large"
- Current limit is 10MB
- Consider compressing files or increasing the limit

### Files not appearing
- Check the Google Drive folder to verify uploads
- Verify the service account has write permissions
- Check the server console for error messages

---

## Benefits of Google Drive Storage

✅ **Centralized Storage** - All files in one place  
✅ **Unlimited Space** - No local disk space issues  
✅ **Easy Access** - Files accessible from anywhere  
✅ **Backup** - Google Drive automatic backup  
✅ **Collaboration** - Easy to share with team members  
✅ **Cost Effective** - Free up to 15GB per Google account

---

## Next Steps

Consider implementing:
- File deletion when delegations are deleted
- Folder organization by date or department
- File versioning for updated attachments
- Private file access (instead of public)
- Thumbnail generation for images
- Audio transcription for voice notes
