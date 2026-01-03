# Google Drive & Sheets Configuration

This document contains all the Google Drive folder IDs and Google Sheets spreadsheet IDs used in the application.

## 📂 Google Drive Folders

All files uploaded through the application are stored in specific Google Drive folders based on their purpose:

### Delegation Documents & Voice Notes
**Folder ID:** `1IH4wziT0GqAHmfT9_MJv9P7v7oo5ueVb`
- **Used for:** Voice notes, reference documents, and attachments in delegations
- **Upload type:** `delegation` or `delegation_doc`
- **File types:** Audio (MP3, WAV, WebM, OGG), Documents (PDF, DOC, DOCX)
- **Access:** https://drive.google.com/drive/folders/1IH4wziT0GqAHmfT9_MJv9P7v7oo5ueVb

### User Profile Images
**Folder ID:** `19W5H8CwUgenQAUIefZYOf4G5G8Lam-9G`
- **Used for:** User profile pictures and avatars
- **Upload type:** `user` or `user_image`
- **File types:** Images (JPEG, PNG, GIF, WebP)
- **Access:** https://drive.google.com/drive/folders/19W5H8CwUgenQAUIefZYOf4G5G8Lam-9G

### Chat Attachments
**Folder ID:** `1FlLZw3LVkMqk-loSq8Rxza95zOcpNWIt`
- **Used for:** Chat message attachments and shared documents
- **Upload type:** `chat` or `chat_doc`
- **File types:** Images, Audio, Documents
- **Access:** https://drive.google.com/drive/folders/1FlLZw3LVkMqk-loSq8Rxza95zOcpNWIt

---

## 📊 Google Sheets Spreadsheets

All application data is stored in Google Sheets:

### Delegation Management
**Spreadsheet ID:** `1bUhEVfY7kVGUFT9jtzDylpvRqWiOvjdqR70OXL1AuA8`
- **Sheets:**
  - `delegation` - Main delegation tasks
  - `delegation_remarks` - Comments and remarks on delegations
  - `delegation_revision_history` - Status and due date change history
- **Access:** https://docs.google.com/spreadsheets/d/1bUhEVfY7kVGUFT9jtzDylpvRqWiOvjdqR70OXL1AuA8

### Users
**Spreadsheet ID:** `1MUGhXK7gUyQ0G_dMIZeRrJ_R8LUW4yR7jzPipvUa6QE`
- **Sheet:** `users`
- **Contains:** User accounts, authentication, roles
- **Access:** https://docs.google.com/spreadsheets/d/1MUGhXK7gUyQ0G_dMIZeRrJ_R8LUW4yR7jzPipvUa6QE

### Todos
**Spreadsheet ID:** `1ZfA9rsi30yc78gFge7s_qB6weBBru4pfEkZlX-iIMng`
- **Sheet:** `todos`
- **Contains:** Personal todo lists and tasks
- **Access:** https://docs.google.com/spreadsheets/d/1ZfA9rsi30yc78gFge7s_qB6weBBru4pfEkZlX-iIMng

### Helpdesk Tickets
**Spreadsheet ID:** `1dCXMJPKDULX4Pq_JqrLQlzk89GmxPlkt84OzbDP_8h0`
- **Sheets:**
  - `helpdesk_tickets` - Support tickets and issues
  - `helpdesk_remarks` - Ticket comments (if applicable)
- **Access:** https://docs.google.com/spreadsheets/d/1dCXMJPKDULX4Pq_JqrLQlzk89GmxPlkt84OzbDP_8h0

### Checklists
**Spreadsheet ID:** `1ogRrWeJPW94Fie883uwW9VO9fEj_IO13QtVLiu34lIg`
- **Sheet:** `checklists`
- **Contains:** Recurring checklists and checklist items
- **Access:** https://docs.google.com/spreadsheets/d/1ogRrWeJPW94Fie883uwW9VO9fEj_IO13QtVLiu34lIg

### Chat Messages
**Spreadsheet ID:** `1fBua3GvVhiewtkAAUzdjDv4MKUN715c9dHqEBEhF3IU`
- **Sheet:** `chat_messages`
- **Contains:** Internal team chat messages
- **Access:** https://docs.google.com/spreadsheets/d/1fBua3GvVhiewtkAAUzdjDv4MKUN715c9dHqEBEhF3IU

---

## 🔧 Configuration Files

### lib/drive.ts
Contains Google Drive folder IDs:
```typescript
export const GOOGLE_DRIVE_FOLDERS = {
  DELEGATION_DOCS: '1IH4wziT0GqAHmfT9_MJv9P7v7oo5ueVb',
  USER_IMAGES: '19W5H8CwUgenQAUIefZYOf4G5G8Lam-9G',
  CHAT_DOCS: '1FlLZw3LVkMqk-loSq8Rxza95zOcpNWIt',
};
```

### lib/sheets.ts
Contains Google Sheets spreadsheet IDs:
```typescript
const SPREADSHEET_IDS = {
  DELEGATION: '1bUhEVfY7kVGUFT9jtzDylpvRqWiOvjdqR70OXL1AuA8',
  USERS: '1MUGhXK7gUyQ0G_dMIZeRrJ_R8LUW4yR7jzPipvUa6QE',
  TODOS: '1ZfA9rsi30yc78gFge7s_qB6weBBru4pfEkZlX-iIMng',
  HELPDESK: '1dCXMJPKDULX4Pq_JqrLQlzk89GmxPlkt84OzbDP_8h0',
  CHECKLISTS: '1ogRrWeJPW94Fie883uwW9VO9fEj_IO13QtVLiu34lIg',
  CHAT: '1fBua3GvVhiewtkAAUzdjDv4MKUN715c9dHqEBEhF3IU',
};
```

---

## 📤 Upload API Usage

### Endpoint: POST `/api/upload`

Upload files to different Google Drive folders by specifying the `type` parameter:

```javascript
// Delegation documents
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('type', 'delegation'); // or 'delegation_doc'

// User profile images
formData.append('type', 'user'); // or 'user_image'

// Chat attachments
formData.append('type', 'chat'); // or 'chat_doc'

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});
```

**Default:** If no `type` is specified, files go to the delegation folder.

---

## ✅ Setup Checklist

Make sure all folders and sheets are properly configured:

- [ ] All Google Drive folders are created
- [ ] Service account (`test1-334@inlaid-index-466017-j8.iam.gserviceaccount.com`) has **Editor** access to all folders
- [ ] All Google Sheets are created with proper sheet names
- [ ] Service account has **Editor** access to all spreadsheets
- [ ] Column headers are set up in each sheet
- [ ] Test file uploads work for each folder type
- [ ] Test data reads/writes work for each spreadsheet

---

## 🔐 Service Account

**Email:** `test1-334@inlaid-index-466017-j8.iam.gserviceaccount.com`

**Required Permissions:**
- Google Drive API: Read/Write access
- Google Sheets API: Read/Write access

**Share all folders and spreadsheets with this email address!**

---

## 📝 Notes

- All uploaded files are made publicly accessible via Google Drive links
- File IDs are stored in Google Sheets for reference
- Maximum file size: 10MB
- Files are automatically timestamped with unique names
- Old folder structure (`/public/uploads/`) is no longer used
