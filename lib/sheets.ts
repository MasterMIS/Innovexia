import { google } from 'googleapis';

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

// Spreadsheet IDs for different features
const SPREADSHEET_IDS = {
  DELEGATION: '1m0H-RXY1lwvY1DKur7-JwUI-FfxLZv7KWPI7HJWlYhM',
  USERS: '1lYFGRBv0FgN2tQuakbpI5GYY8h8M8jUptGW-z8l9g_4',
  TODOS: '1wqMwWLFyEDUUvTI3CrVyFXemLnTYcTf7JVxcZhCLHO0',
  HELPDESK: '17AWbMisFx_cjC2exMpf86d21VKp1dl-q49FWIcWaSkk',
  CHECKLISTS: '1PbXHXWj3jRsA6EvEHZMyzFe7Q0BsUrvCEX5PslAbhSg',
  CHAT: '1BUiGYRmlT-fcQ7Qw9VIJkyPRyzdiuSeleJY785QncHM',
};

// Backward compatibility
const DELEGATION_SPREADSHEET_ID = SPREADSHEET_IDS.DELEGATION;
const USERS_SPREADSHEET_ID = SPREADSHEET_IDS.USERS;

// Sheet names
const SHEETS = {
  DELEGATION: 'delegation',
  DELEGATION_REMARKS: 'delegation_remarks',
  DELEGATION_HISTORY: 'delegation_revision_history',
  USERS: 'users'
};

// Initialize Google Sheets API client with Service Account
export async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

// Helper function to convert array to object based on header row
function rowToObject(headers: string[], row: any[]): any {
  const obj: any = {};
  headers.forEach((header, index) => {
    const value = row[index];
    // Try to parse JSON strings
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        obj[header] = JSON.parse(value);
      } catch {
        obj[header] = value;
      }
    } else {
      obj[header] = value === '' ? null : value;
    }
  });
  return obj;
}

// Helper function to convert object to array based on header row
function objectToRow(headers: string[], obj: any): any[] {
  return headers.map(header => {
    const value = obj[header];
    // Convert objects/arrays to JSON strings
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return value === null || value === undefined ? '' : String(value);
  });
}

// DELEGATION CRUD OPERATIONS

export async function getDelegations(userId: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.DELEGATION;

    // Read all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Convert rows to objects and filter by user_id
    const delegations = dataRows
      .map(row => rowToObject(headers, row))
      .filter(delegation => parseInt(delegation.user_id) === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return delegations;
  } catch (error) {
    console.error('Error fetching delegations from Google Sheets:', error);
    throw error;
  }
}

export async function createDelegation(delegationData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.DELEGATION;

    // Read headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
    });

    const headers = response.data.values?.[0] || [];
    
    // If no headers, initialize the sheet
    if (headers.length === 0) {
      const defaultHeaders = [
        'id', 'user_id', 'delegation_name', 'description', 'assigned_to', 'doer_name',
        'department', 'priority', 'due_date', 'status', 'voice_note_url', 
        'reference_docs', 'evidence_required', 'created_at', 'updated_at'
      ];
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: DELEGATION_SPREADSHEET_ID,
        range: `${sheetName}!A1:O1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [defaultHeaders],
        },
      });
      
      headers.push(...defaultHeaders);
    }

    // Generate ID (get last row number)
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
    });
    const allRows = allDataResponse.data.values || [];
    const newId = allRows.length; // Row number serves as ID

    // Prepare delegation data with ID
    const delegation = {
      id: newId,
      ...delegationData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Convert to row array
    const rowData = objectToRow(headers, delegation);

    // Append row
    await sheets.spreadsheets.values.append({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });
    
    return delegation;
  } catch (error) {
    console.error('Error creating delegation in Google Sheets:', error);
    throw error;
  }
}

export async function updateDelegation(id: number, delegationData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.DELEGATION;

    // Read all data to find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Delegation not found');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Find row index by ID
    const rowIndex = dataRows.findIndex(row => parseInt(row[0]) === id);
    if (rowIndex === -1) {
      throw new Error('Delegation not found');
    }

    // Update the delegation object
    const existingDelegation = rowToObject(headers, dataRows[rowIndex]);
    const updatedDelegation = {
      ...existingDelegation,
      ...delegationData,
      updated_at: new Date().toISOString()
    };

    // Convert to row array
    const rowData = objectToRow(headers, updatedDelegation);

    // Update the specific row (add 2 to rowIndex: 1 for header, 1 for 0-based index)
    const actualRowNumber = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRowNumber}:Z${actualRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });
    
    return updatedDelegation;
  } catch (error) {
    console.error('Error updating delegation in Google Sheets:', error);
    throw error;
  }
}

export async function deleteDelegation(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.DELEGATION;

    // Read all data to find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Delegation not found');
    }

    const dataRows = rows.slice(1);
    const rowIndex = dataRows.findIndex(row => parseInt(row[0]) === id);
    
    if (rowIndex === -1) {
      throw new Error('Delegation not found');
    }

    // Delete the row (add 2 to rowIndex: 1 for header, 1 for 0-based index)
    const actualRowNumber = rowIndex + 2;
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // Assumes first sheet, you may need to get this dynamically
                dimension: 'ROWS',
                startIndex: actualRowNumber - 1,
                endIndex: actualRowNumber
              }
            }
          }
        ]
      }
    });
    
    return { id };
  } catch (error) {
    console.error('Error deleting delegation from Google Sheets:', error);
    throw error;
  }
}

// DELEGATION REMARKS OPERATIONS

export async function getDelegationRemarks(delegationId: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.DELEGATION_REMARKS;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const remarks = dataRows
      .map(row => rowToObject(headers, row))
      .filter(remark => parseInt(remark.delegation_id) === delegationId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return remarks;
  } catch (error) {
    console.error('Error fetching remarks from Google Sheets:', error);
    throw error;
  }
}

export async function createDelegationRemark(remarkData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.DELEGATION_REMARKS;

    // Read headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
    });

    const headers = response.data.values?.[0] || [];
    
    // If no headers, initialize the sheet
    if (headers.length === 0) {
      const defaultHeaders = ['id', 'delegation_id', 'user_id', 'username', 'remark', 'created_at'];
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: DELEGATION_SPREADSHEET_ID,
        range: `${sheetName}!A1:F1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [defaultHeaders],
        },
      });
      
      headers.push(...defaultHeaders);
    }

    // Generate ID
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
    });
    const allRows = allDataResponse.data.values || [];
    const newId = allRows.length;

    const remark = {
      id: newId,
      ...remarkData,
      created_at: new Date().toISOString()
    };

    const rowData = objectToRow(headers, remark);

    await sheets.spreadsheets.values.append({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });

    return remark;
  } catch (error) {
    console.error('Error creating remark in Google Sheets:', error);
    throw error;
  }
}

// DELEGATION REVISION HISTORY OPERATIONS

export async function getDelegationHistory(delegationId: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.DELEGATION_HISTORY;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const history = dataRows
      .map(row => rowToObject(headers, row))
      .filter(record => parseInt(record.delegation_id) === delegationId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return history;
  } catch (error) {
    console.error('Error fetching history from Google Sheets:', error);
    throw error;
  }
}

export async function createDelegationHistory(historyData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.DELEGATION_HISTORY;

    // Read headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
    });

    const headers = response.data.values?.[0] || [];
    
    // If no headers, initialize the sheet
    if (headers.length === 0) {
      const defaultHeaders = [
        'id', 'delegation_id', 'old_status', 'new_status', 
        'old_due_date', 'new_due_date', 'reason', 'created_at'
      ];
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: DELEGATION_SPREADSHEET_ID,
        range: `${sheetName}!A1:H1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [defaultHeaders],
        },
      });
      
      headers.push(...defaultHeaders);
    }

    // Generate ID
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
    });
    const allRows = allDataResponse.data.values || [];
    const newId = allRows.length;

    const history = {
      id: newId,
      ...historyData,
      created_at: new Date().toISOString()
    };

    const rowData = objectToRow(headers, history);

    await sheets.spreadsheets.values.append({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });

    return history;
  } catch (error) {
    console.error('Error creating history in Google Sheets:', error);
    throw error;
  }
}

// Helper function to get delegation by ID
export async function getDelegationById(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.DELEGATION;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return null;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const delegation = dataRows
      .map(row => rowToObject(headers, row))
      .find(d => parseInt(d.id) === id);

    return delegation || null;
  } catch (error) {
    console.error('Error fetching delegation by ID from Google Sheets:', error);
    throw error;
  }
}

// USER CRUD OPERATIONS

export async function getAllUsers() {
  try {

    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.USERS;

    // Read all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Convert rows to objects
    const users = dataRows
      .map(row => rowToObject(headers, row))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    
    return users;
  } catch (error) {
    console.error('Error fetching users from Google Sheets:', error);
    throw error;
  }
}

export async function createUser(userData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.USERS;

    // Get existing data to determine the next ID and get headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Sheet is empty or headers are missing');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Generate new ID
    const maxId = dataRows.length > 0 
      ? Math.max(...dataRows.map(row => parseInt(row[0]) || 0))
      : 0;
    const newId = maxId + 1;

    // Create new user object with ID and timestamp
    const newUser = {
      id: newId,
      username: userData.username,
      email: userData.email,
      password: userData.password,
      phone: userData.phone || '',
      role_id: userData.roleId || 3,
      image_url: userData.imageUrl || '',
      created_at: new Date().toISOString()
    };

    // Convert to row
    const newRow = objectToRow(headers, newUser);

    // Append the new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [newRow],
      },
    });
    
    return newUser;
  } catch (error) {
    console.error('Error creating user in Google Sheets:', error);
    throw error;
  }
}

export async function updateUser(id: number, userData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.USERS;

    // Get all rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Sheet is empty');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Find the row index
    const rowIndex = dataRows.findIndex(row => parseInt(row[0]) === id);
    if (rowIndex === -1) {
      throw new Error('User not found');
    }

    // Get existing user data
    const existingUser = rowToObject(headers, dataRows[rowIndex]);

    // Update user data (only update provided fields)
    const updatedUser = {
      ...existingUser,
      email: userData.email !== undefined ? userData.email : existingUser.email,
      phone: userData.phone !== undefined ? userData.phone : existingUser.phone,
      role_id: userData.roleId !== undefined ? userData.roleId : existingUser.role_id,
      image_url: userData.imageUrl !== undefined ? userData.imageUrl : existingUser.image_url,
    };

    // Only update password if provided
    if (userData.password) {
      updatedUser.password = userData.password;
    }

    // Convert to row
    const updatedRow = objectToRow(headers, updatedUser);

    // Update the row (rowIndex + 2 because: +1 for 1-based indexing, +1 for header row)
    const actualRowNumber = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRowNumber}:Z${actualRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [updatedRow],
      },
    });
    
    return updatedUser;
  } catch (error) {
    console.error('Error updating user in Google Sheets:', error);
    throw error;
  }
}

export async function deleteUser(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.USERS;

    // Get all rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Sheet is empty');
    }

    const dataRows = rows.slice(1);

    // Find the row index
    const rowIndex = dataRows.findIndex(row => parseInt(row[0]) === id);
    if (rowIndex === -1) {
      throw new Error('User not found');
    }

    // Delete the row (rowIndex + 2 because: +1 for 1-based indexing, +1 for header row)
    const actualRowNumber = rowIndex + 2;
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: USERS_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // Assuming first sheet, adjust if needed
                dimension: 'ROWS',
                startIndex: actualRowNumber - 1, // 0-based for API
                endIndex: actualRowNumber, // exclusive
              },
            },
          },
        ],
      },
    });
    
    return { id };
  } catch (error) {
    console.error('Error deleting user from Google Sheets:', error);
    throw error;
  }
}

// Export spreadsheet IDs for use in other features
export { SPREADSHEET_IDS };
