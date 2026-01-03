# ⚠️ IMPORTANT: Shared Drive Setup Required

## The Issue

Service accounts **cannot upload files to regular Google Drive folders** because they don't have storage quota. You'll get this error:

```
Error: Service Accounts do not have storage quota. Leverage shared drives
```

## Solutions

You have **two options** to fix this:

---

### ✅ **Option 1: Use Shared Drives (Recommended)**

Shared Drives (formerly Team Drives) are designed for organizations and work perfectly with service accounts.

#### Step-by-Step:

1. **Create a Shared Drive** (requires Google Workspace)
   - Go to [Google Drive](https://drive.google.com)
   - Click the "Shared drives" tab on the left
   - Click "New +" button at the top
   - Name it "ERP App Files"

2. **Create Folders in the Shared Drive**
   - Inside your shared drive, create these folders:
     - `Delegation Documents`
     - `User Images`
     - `Chat Attachments`

3. **Add Service Account as Member**
   - Click on the shared drive name → "Manage members"
   - Add: `test1-334@inlaid-index-466017-j8.iam.gserviceaccount.com`
   - Set role to **"Content manager"** or **"Manager"**

4. **Get Folder IDs**
   - Open each folder
   - Copy the folder ID from the URL:
     ```
     https://drive.google.com/drive/folders/FOLDER_ID_HERE
     ```

5. **Update the IDs in Code**
   - Open `lib/drive.ts`
   - Replace the folder IDs:
     ```typescript
     export const GOOGLE_DRIVE_FOLDERS = {
       DELEGATION_DOCS: 'YOUR_NEW_DELEGATION_FOLDER_ID',
       USER_IMAGES: 'YOUR_NEW_USER_IMAGES_FOLDER_ID',
       CHAT_DOCS: 'YOUR_NEW_CHAT_FOLDER_ID',
     };
     ```

---

### ✅ **Option 2: Use Regular Drive with Ownership Transfer**

If you don't have Google Workspace (no Shared Drives), you can still use regular folders:

#### Step-by-Step:

1. **Make sure the folders are in YOUR personal Google Drive** (the account that owns the service account)

2. **Share the folders with the service account**
   - Right-click each folder → "Share"
   - Add: `test1-334@inlaid-index-466017-j8.iam.gserviceaccount.com`
   - Give **"Editor"** access
   - Click "Send"

3. **Verify the folder IDs are correct**
   - The current IDs in your code:
     ```
     DELEGATION_DOCS: '1IH4wziT0GqAHmfT9_MJv9P7v7oo5ueVb'
     USER_IMAGES: '19W5H8CwUgenQAUIefZYOf4G5G8Lam-9G'
     CHAT_DOCS: '1FlLZw3LVkMqk-loSq8Rxza95zOcpNWIt'
     ```

4. **Important:** These folders must be owned by a regular Google account (not the service account)

---

## What We Fixed

I've already updated the code to support Shared Drives by adding these parameters:

```typescript
// In lib/drive.ts
drive.files.create({
  // ... 
  supportsAllDrives: true,  // ✅ Added
});

drive.permissions.create({
  // ...
  supportsAllDrives: true,  // ✅ Added
});

drive.files.list({
  // ...
  supportsAllDrives: true,  // ✅ Added
  includeItemsFromAllDrives: true,  // ✅ Added
});
```

---

## Testing

After setup, test by:

1. Go to `/users` page
2. Try to add a user with a profile image
3. Upload should work without errors

Or run this test:
```bash
# In the browser console on /users page
const formData = new FormData();
formData.append('file', yourFile);
formData.append('type', 'user');

fetch('/api/upload', { method: 'POST', body: formData })
  .then(r => r.json())
  .then(console.log);
```

---

## Verification Checklist

- [ ] Created Shared Drive OR using regular drive folders owned by your account
- [ ] Created folders: Delegation Documents, User Images, Chat Attachments
- [ ] Added service account email to the drive/folders with Editor/Content Manager access
- [ ] Updated folder IDs in `lib/drive.ts` (if using new folders)
- [ ] Restarted the development server
- [ ] Tested file upload from Users page
- [ ] Verified files appear in Google Drive

---

## Still Not Working?

If you continue to get errors:

1. **Check folder permissions**
   ```
   Open each folder → Right-click → "Share"
   Verify: test1-334@inlaid-index-466017-j8.iam.gserviceaccount.com is listed
   ```

2. **Verify folder IDs**
   ```
   The folder ID is the last part of the URL when viewing the folder
   ```

3. **Check service account scopes**
   ```typescript
   // In lib/drive.ts, make sure these scopes are included:
   scopes: [
     'https://www.googleapis.com/auth/drive.file',
     'https://www.googleapis.com/auth/drive'
   ]
   ```

4. **Restart the server** after any code changes
   ```bash
   npm run dev
   ```

---

## Need Help?

Contact your Google Workspace admin to:
- Create a Shared Drive
- Add the service account as a member
- Get proper folder IDs
