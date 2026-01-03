import { google } from 'googleapis';
import { Readable } from 'stream';

// Google Service Account credentials
const SERVICE_ACCOUNT_CREDENTIALS = {
  type: "service_account",
  project_id: "clean-yew-483214-s7",
  private_key_id: "4eb37472b1af93090d5eac25a2adaf835b19924f",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCyPMFT6z4IJYRb\n4u0Gd3YH9ER1Vz+Nuf/78dCrqerwKM0ciBo6KMdFEJELQkEYPvW4PgpQqS8xaE4f\nTWXeN3xLRq9RsDXUB+HtklrtdaF7XNIThRJmLcQHqtDwR3CabbuJlXq1zKfQfmP5\nT3PnUDQ3KmXL+Irlm5SFy8u+b+E4UUD1YY4TDYDDGOID+RD6iddJ6DDxOjhk7MCp\nT7EGBSSwZhz3JTJKlqPBS0mHKFBBPkQ6AuoQ/HwKH1hrKePjlLOpVM2Evjel28+Q\nsyTEYuB338wxrXk6hCvvMRSn1XbwcVy+Fiasnx+96lr5x2xq1Pd7bPZdBXFxXb6D\nrAWqCiD3AgMBAAECggEAEwDmTffBc+XoIFHoGq3nAD8bg3VLeeVwdSDZskvaGEQJ\nZnbecQADCwqSpGQqg5bG5R98QxBez0JDPhQm/dPlpTMCo0+J1bMHdCiMGFBX6MrD\nPUCNbyaHBZhBUbUUPOrhOXCeFj8dT14Cc8T0Yx/KiW00UFSOHqABbGiHryTHmxTl\nDRHalOIeSEiWbg43M0w42xIK+vIFM0wlTuNrzUXChyy3wU+g/mH1I6uJ5UCWOd2B\n8aThvl5m7iK0Lu1YIvc5ADY91LAfl0VdWjZO8K7yJWI1pAnmHy8bWJho3NGmJmFo\nht9ZTdQib6Jz6fa8F6CfbvG0zK4iBdSmza2j1UXkdQKBgQDmei0PtkgqjzfBa3x2\nqWoXfeWsK9Gfh6a+2ZKk7uK8oJCwSCfGgEwxnGLwjrZvzaKBSg34bM6vC92rEOV8\nj/4w7G2ATCWXrwghBvMpvd2CvXghSXNa49oL8JEdIndJfF5Qow720NsZandEC3Oi\nNFjso4gczhLMoxYEoeo1ZjgizQKBgQDF+Z++EK/l6g+X5fflDjpcOb2tFyU3dCGf\ncLZfUnvc2B5MPZW1k46gUfuUWSFQKLuDqPFSK5VYB1Zrlaw/mc6/3m+IwjAENNrN\nmnNP9+OCwYSOC+js5OFj/Dc98mrDcZAJjI1KKD9Vq+nPPFcMa7ESbLndqnbul/8N\nT2nLB2860wKBgCZMIvS7a153EeK4A6SMHi7tIp7rYRfLKLAJ4044y8BgReqk8scP\nRpnvzJkAfdwyJVCqh4vCOM3pgNoOIrQCEVD72G47OPvtf8JNL1a+T/KLnUyasepm\ndjMJtHNM6NlzKxDnJ3Nn3SBqCotqA7ruS+B2hAWVUJZkeyIl7Y8V/zn5AoGAPfHf\nU78w6oWUH3krWZZcGGNQwAoP8Qv7QUIpLiZG71EIGd7jKw9ifzNnvoEs9UHpekaw\nS3+rmQGivsL0RGpB0LMuvuHT2F0ZYV/EWO89VrpqWW/Mj+MFyx0tw8pIMaMk6Hf7\n9YomVw4VeGxu6EoB+7vdZEhkMj+I5IdGmOpYmVUCgYEA3EJ83ZQT5/r6ddSmMCWa\njWgm0hZeoXymZYBI+yHsVtWt/t8HpO4WcSpwJmOxODXAR1gkJ3K2kZiD1pVPk8xc\nnbjz/aLuwRToorcOSMXmk6mSUSIC+DHnHUs55hKF7kngj9L/zDMD+fM9jcUoPP3f\nwFGkybJViC+FdOdWmanhU+0=\n-----END PRIVATE KEY-----\n",
  client_email: "sohan-595@clean-yew-483214-s7.iam.gserviceaccount.com",
  client_id: "100523899003841193231",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/sohan-595%40clean-yew-483214-s7.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

// Google Drive folder IDs for different features
export const GOOGLE_DRIVE_FOLDERS = {
  DELEGATION_DOCS: '1qFcXd4be7Ii3xnPa0kLW8DiBthtHKQ-C',
  USER_IMAGES: '11Q5YUcaGcOKEW2mqDFHqmijXVx4TbDX7',
  CHAT_DOCS: '1wheUmuq2oq-AuSULQDv7XcnSfR6J4uJ6',
};

// Default folder (delegation)
export const GOOGLE_DRIVE_FOLDER_ID = GOOGLE_DRIVE_FOLDERS.DELEGATION_DOCS;

// Initialize Google Drive API client with Service Account
export async function getGoogleDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive'], // Full Drive access for existing folders
  });

  const drive = google.drive({ version: 'v3', auth });
  return drive;
}

// Upload file to Google Drive
export async function uploadToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string = GOOGLE_DRIVE_FOLDERS.DELEGATION_DOCS
): Promise<{
  fileId: string;
  publicUrl: string;
  downloadUrl: string;
  fileName: string;
}> {
  try {
    const drive = await getGoogleDriveClient();

    // Convert buffer to readable stream
    const stream = Readable.from(buffer);

    // Upload file to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true, // Support for shared drives
    });

    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true, // Support for shared drives
    });

    const fileId = response.data.id!;
    const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    return {
      fileId,
      publicUrl,
      downloadUrl,
      fileName: response.data.name!,
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
}

// Delete file from Google Drive
export async function deleteFromDrive(fileId: string): Promise<void> {
  try {
    const drive = await getGoogleDriveClient();
    await drive.files.delete({
      fileId: fileId,
      supportsAllDrives: true, // Support for shared drives
    });
  } catch (error) {
    console.error('Error deleting from Google Drive:', error);
    throw error;
  }
}

// List files in a folder
export async function listDriveFiles(folderId: string = GOOGLE_DRIVE_FOLDERS.DELEGATION_DOCS): Promise<any[]> {
  try {
    const drive = await getGoogleDriveClient();
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, createdTime, size, webViewLink)',
      orderBy: 'createdTime desc',
      supportsAllDrives: true, // Support for shared drives
      includeItemsFromAllDrives: true, // Include files from shared drives
    });

    return response.data.files || [];
  } catch (error) {
    console.error('Error listing Drive files:', error);
    throw error;
  }
}
