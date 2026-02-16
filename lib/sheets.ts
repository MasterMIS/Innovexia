import { google } from 'googleapis';
import { getGoogleSheetsClient as getOAuthSheetsClient } from './oauth';
import { parseSheetDate, ensureIsoDate, formatToSheetDate } from './dateUtils';

// Spreadsheet IDs for different features
export const SPREADSHEET_IDS = {
  DELEGATION: '1xlKmalbpTniv37Umd1iKmB02AhtNlURQ5LrzQsHYhAA',
  USERS: '1SoxiAeO2OKDTLMdtT414FBKqW2K5z3kEMD5Y2Uh8NWg',
  TODOS: '1ZXPGc5IpCsAEDA10zjqjARJsAA3286SY21IHXAj1_UQ',
  HELPDESK: '1GSvFkMoSoY9TgUBgw5RxJb33ZVcN5BKkH7sw30rMoLA',
  CHECKLISTS: '1KnbqHtNusr2C_QBiX2e_L3LHbsRJy68YEwuphRtTBVU',
  CHAT: '1JcmmE4fdHXdnjSHklmX57LFI5BUEjBiLbb6a9p2H7vY',
  NOTIFICATIONS: '13YU7-tC18jNn8304wjUylQFokNpSEg-kQUK5BFln-Lo',
  MOM: '1BRw7HIjXetxNc4xUK1e13_qHxbZcpWFkoX_abMDT5kg',
  LEAD_TO_SALES: '1VqiC42NJuuAnzCXjQGsd1fuyTMd8pBOtEr7o3sArsZs',
  DEPARTMENTS: '1KNhtJtKj3GYB6_tnlAO2hp0mpZkl0mbdWZiWtRoqYvM',
  NBD: '1T6y8oSCZKCcZ50WrXEYyQcsOfh2hAGzZK4hQehCwhS8',
  O2D: '1mKIdZK0ZKNsN7qHY675FN6fjLwD2TxyBowXsHDDWwkc',
  ATTENDANCE: '1oNRk7oTfnXiJWBq0lv6dW60kHcQfEV8WQEixFBOe-CM',
};

// Backward compatibility
const DELEGATION_SPREADSHEET_ID = SPREADSHEET_IDS.DELEGATION;
const USERS_SPREADSHEET_ID = SPREADSHEET_IDS.USERS;
const NOTIFICATIONS_SPREADSHEET_ID = SPREADSHEET_IDS.NOTIFICATIONS;
const NBD_SPREADSHEET_ID = SPREADSHEET_IDS.NBD;
const O2D_SPREADSHEET_ID = SPREADSHEET_IDS.O2D;
const ATTENDANCE_SPREADSHEET_ID = SPREADSHEET_IDS.ATTENDANCE;

// Local wrapper removed in favor of shared formatToSheetDate

// Sheet names
const SHEETS = {
  DELEGATION: 'delegation',
  DELEGATION_REMARKS: 'delegation_remarks',
  DELEGATION_HISTORY: 'delegation_revision_history',
  USERS: 'users',
  CHAT_MESSAGES: 'chat_messages',
  NBD: 'NBD',
  NBD_INCOMING: 'NBD Incoming',
  CRR: 'CRR',
  O2D: 'O2D',
  ATTENDANCE: 'Sheet1',
  LEAVE_REMARK: 'leave_remark'
};

// Initialize Google Sheets API client with OAuth
export async function getGoogleSheetsClient() {
  return await getOAuthSheetsClient();
}

// Helper function to convert array to object based on header row
export function rowToObject(headers: string[], row: any[]): any {
  const obj: any = {};
  headers.forEach((header, index) => {
    const value = row[index];

    // Handle education and work_experience fields - ensure they're strings
    if ((header === 'education' || header === 'work_experience') && value) {
      if (typeof value === 'string') {
        obj[header] = value; // Keep as string for parsing later
      } else if (typeof value === 'object') {
        obj[header] = JSON.stringify(value); // Convert object to JSON string
      } else {
        obj[header] = '[]'; // Default empty array
      }
      return;
    }

    // Handle boolean fields from Google Sheets
    if (header === 'evidence_required' || header === 'verification_required' || header === 'attachment_required') {
      if (typeof value === 'boolean') {
        obj[header] = value;
        return;
      }
      if (typeof value === 'string') {
        obj[header] = value.toUpperCase() === 'TRUE';
        return;
      }
    }

    // Handle Date fields automatically
    const dateHeaders = ['created_at', 'updated_at', 'due_date', 'date', 'last_updated', 'follow_up_date', 'next_follow_up_date'];
    if (dateHeaders.includes(header.toLowerCase())) {
      obj[header] = parseSheetDate(value);
      return;
    }

    // Try to parse JSON strings for other fields
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        obj[header] = JSON.parse(value);
      } catch {
        obj[header] = value;
      }
    } else {
      // Explicitly handle empty/undefined values as null to preserve keys in JSON
      obj[header] = (value === '' || value === undefined) ? null : value;
    }
  });
  return obj;
}

// Helper function to convert object to array based on header row
export function objectToRow(headers: string[], obj: any): any[] {
  return headers.map(header => {
    const value = obj[header];
    // Convert objects/arrays to JSON strings
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    // Return empty string for null/undefined
    if (value === null || value === undefined) {
      return '';
    }
    // For date-like strings (dd/mm/yyyy HH:mm:ss), return as is
    // Google Sheets will recognize them as text without adding quotes
    return value;
  });
}

// DELEGATION CRUD OPERATIONS

export async function getDelegations(userId: number, role?: string, username?: string) {
  try {

    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.DELEGATION;

    // Read all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Convert rows to objects
    let delegations = dataRows
      .map(row => rowToObject(headers, row))
      .filter(delegation => delegation.id); // Filter out empty rows

    // Filter based on role
    if (role?.toLowerCase() === 'admin') {
      // Admin - show all delegations
      // No filtering needed
    } else if (role?.toLowerCase() === 'tl') {
      // TL - show delegations where they are assignee or doer
      delegations = delegations.filter(delegation =>
        (delegation.doer_name && username && delegation.doer_name.toLowerCase() === username.toLowerCase()) ||
        (delegation.assigned_to && username && delegation.assigned_to.toLowerCase() === username.toLowerCase())
      );
    } else {
      // Regular user - show only delegations where user is the doer
      delegations = delegations.filter(delegation =>
        delegation.doer_name && username &&
        delegation.doer_name.toLowerCase() === username.toLowerCase()
      );
    }

    // Sort by created_at descending
    delegations.sort((a, b) => {
      const dateA = parseSheetDate(a.created_at);
      const dateB = parseSheetDate(b.created_at);
      return (dateB ? new Date(dateB).getTime() : 0) - (dateA ? new Date(dateA).getTime() : 0);
    });

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
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const headers = response.data.values?.[0] || [];

    // If no headers, initialize the sheet
    if (headers.length === 0) {
      const defaultHeaders = [
        'id', 'user_id', 'delegation_name', 'description', 'assigned_to', 'doer_name',
        'department', 'priority', 'due_date', 'status', 'voice_note_url',
        'reference_docs', 'evidence_required', 'evidence_urls', 'created_at', 'updated_at'
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
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const allRows = allDataResponse.data.values || [];
    const newId = allRows.length; // Row number serves as ID

    // Prepare delegation data with ID
    const delegation = {
      id: newId,
      ...delegationData,
      created_at: formatToSheetDate(new Date()),
      updated_at: formatToSheetDate(new Date())
    };

    // Convert to row array
    const rowData = objectToRow(headers, delegation);

    // Append row
    await sheets.spreadsheets.values.append({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
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

    // 1. Get Headers (A1:Z1)
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const headers = headerResponse.data.values?.[0];
    if (!headers) throw new Error('Headers not found');

    // 2. Get All IDs (Column A) to find the row index - much faster than getting all data
    const idResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const idColumn = idResponse.data.values;
    if (!idColumn || idColumn.length === 0) {
      throw new Error('Delegation not found');
    }

    // Find row index by ID
    // Note: idColumn[i][0] contains the ID string
    const rowIndex = idColumn.findIndex(row => {
      if (!row || row.length === 0) return false;
      const rowId = parseInt(row[0]);
      const searchId = typeof id === 'string' ? parseInt(id) : id;
      return rowId === searchId;
    });

    if (rowIndex === -1) {
      throw new Error('Delegation not found');
    }

    // Calculate actual row number (1-based)
    // rowIndex is 0-based index from the data array. The data array starts at A1.
    // So if ID is at index 1 (which is A2), the row number is 2.
    // However, ensure we handle the header row correctly if it was included or excluded.
    // A:A usually includes A1 (header).
    const actualRowNumber = rowIndex + 1;

    // 3. Get the specific row data
    const rowResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRowNumber}:Z${actualRowNumber}`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const currentRowValues = rowResponse.data.values?.[0];
    if (!currentRowValues) throw new Error('Failed to fetch row data');

    // 4. Update the delegation object
    const existingDelegation = rowToObject(headers, currentRowValues);

    // EXPLICITLY preserve created_at to prevent it being overwritten
    const preservedCreatedAt = existingDelegation.created_at;

    const updatedDelegation = {
      ...existingDelegation,
      ...delegationData,
      created_at: preservedCreatedAt, // Ensure created_at is NOT updated
      updated_at: formatToSheetDate(new Date())
    };

    // 5. Convert to row array
    const rowData = objectToRow(headers, updatedDelegation);

    // 6. Update the specific row
    await sheets.spreadsheets.values.update({
      spreadsheetId: DELEGATION_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRowNumber}:Z${actualRowNumber}`,
      valueInputOption: 'USER_ENTERED',
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
      valueRenderOption: 'UNFORMATTED_VALUE',
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
      valueRenderOption: 'UNFORMATTED_VALUE',
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
      valueRenderOption: 'UNFORMATTED_VALUE',
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
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const allRows = allDataResponse.data.values || [];
    const newId = allRows.length;

    const remark = {
      id: newId,
      ...remarkData,
      created_at: formatToSheetDate(new Date())
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
      valueRenderOption: 'UNFORMATTED_VALUE',
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
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const headers = response.data.values?.[0] || [];

    // If no headers, initialize the sheet
    if (headers.length === 0) {
      const defaultHeaders = [
        'id', 'delegation_id', 'old_status', 'new_status',
        'old_due_date', 'new_due_date', 'reason', 'evidence_urls', 'created_at'
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
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const allRows = allDataResponse.data.values || [];
    const newId = allRows.length;

    const history = {
      id: newId,
      ...historyData,
      created_at: formatToSheetDate(new Date())
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
      valueRenderOption: 'UNFORMATTED_VALUE',
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
      range: `${sheetName}!A:AZ`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Convert rows to objects - role_name is now stored directly
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
      range: `${sheetName}!A:AZ`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    let headers: string[];
    let dataRows: any[] = [];

    // Define all column headers
    const allHeaders = [
      'id', 'username', 'email', 'password', 'phone', 'role_name', 'image_url',
      'dob', 'uan_number', 'aadhaar_number', 'pan_number',
      'present_address_line1', 'present_address_line2', 'present_city', 'present_country', 'present_state', 'present_postal_code',
      'permanent_same_as_present', 'permanent_address_line1', 'permanent_address_line2', 'permanent_city', 'permanent_country', 'permanent_state', 'permanent_postal_code',
      'experience', 'source_of_hire', 'skill_set', 'highest_qualification', 'additional_information',
      'location', 'title', 'current_salary', 'department', 'offer_letter_url', 'tentative_joining_date',
      'education', 'work_experience', 'created_at'
    ];

    // If sheet is empty, create headers
    if (!rows || rows.length === 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: USERS_SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [allHeaders],
        },
      });
      headers = allHeaders;
    } else {
      headers = rows[0];
      dataRows = rows.slice(1);

      // Check if all required headers exist, if not update them
      const missingHeaders = allHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        // Update header row with all headers
        await sheets.spreadsheets.values.update({
          spreadsheetId: USERS_SPREADSHEET_ID,
          range: `${sheetName}!A1:AZ1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [allHeaders],
          },
        });
        headers = allHeaders;
      }
    }

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
      role_name: userData.roleName || 'User',
      image_url: userData.imageUrl || '',
      dob: userData.dob || '',
      uan_number: userData.uanNumber || '',
      aadhaar_number: userData.aadhaarNumber || '',
      pan_number: userData.panNumber || '',
      present_address_line1: userData.presentAddressLine1 || '',
      present_address_line2: userData.presentAddressLine2 || '',
      present_city: userData.presentCity || '',
      present_country: userData.presentCountry || '',
      present_state: userData.presentState || '',
      present_postal_code: userData.presentPostalCode || '',
      permanent_same_as_present: userData.permanentSameAsPresent || false,
      permanent_address_line1: userData.permanentAddressLine1 || '',
      permanent_address_line2: userData.permanentAddressLine2 || '',
      permanent_city: userData.permanentCity || '',
      permanent_country: userData.permanentCountry || '',
      permanent_state: userData.permanentState || '',
      permanent_postal_code: userData.permanentPostalCode || '',
      experience: userData.experience || '',
      source_of_hire: userData.sourceOfHire || '',
      skill_set: userData.skillSet || '',
      highest_qualification: userData.highestQualification || '',
      additional_information: userData.additionalInformation || '',
      location: userData.location || '',
      title: userData.title || '',
      current_salary: userData.currentSalary || '',
      department: userData.department || '',
      offer_letter_url: userData.offerLetterUrl || '',
      tentative_joining_date: userData.tentativeJoiningDate || '',
      education: userData.education || '[]',
      work_experience: userData.workExperience || '[]',
      created_at: formatToSheetDate(new Date())
    };

    // Convert to row
    const newRow = objectToRow(headers, newUser);

    // Append the new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: `${sheetName}!A:AZ`,
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
      range: `${sheetName}!A:AZ`,
      valueRenderOption: 'UNFORMATTED_VALUE',
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
      role_name: userData.roleName !== undefined ? userData.roleName : existingUser.role_name,
      image_url: userData.imageUrl !== undefined ? userData.imageUrl : existingUser.image_url,
      dob: userData.dob !== undefined ? userData.dob : existingUser.dob,
      uan_number: userData.uanNumber !== undefined ? userData.uanNumber : existingUser.uan_number,
      aadhaar_number: userData.aadhaarNumber !== undefined ? userData.aadhaarNumber : existingUser.aadhaar_number,
      pan_number: userData.panNumber !== undefined ? userData.panNumber : existingUser.pan_number,
      present_address_line1: userData.presentAddressLine1 !== undefined ? userData.presentAddressLine1 : existingUser.present_address_line1,
      present_address_line2: userData.presentAddressLine2 !== undefined ? userData.presentAddressLine2 : existingUser.present_address_line2,
      present_city: userData.presentCity !== undefined ? userData.presentCity : existingUser.present_city,
      present_country: userData.presentCountry !== undefined ? userData.presentCountry : existingUser.present_country,
      present_state: userData.presentState !== undefined ? userData.presentState : existingUser.present_state,
      present_postal_code: userData.presentPostalCode !== undefined ? userData.presentPostalCode : existingUser.present_postal_code,
      permanent_same_as_present: userData.permanentSameAsPresent !== undefined ? userData.permanentSameAsPresent : existingUser.permanent_same_as_present,
      permanent_address_line1: userData.permanentAddressLine1 !== undefined ? userData.permanentAddressLine1 : existingUser.permanent_address_line1,
      permanent_address_line2: userData.permanentAddressLine2 !== undefined ? userData.permanentAddressLine2 : existingUser.permanent_address_line2,
      permanent_city: userData.permanentCity !== undefined ? userData.permanentCity : existingUser.permanent_city,
      permanent_country: userData.permanentCountry !== undefined ? userData.permanentCountry : existingUser.permanent_country,
      permanent_state: userData.permanentState !== undefined ? userData.permanentState : existingUser.permanent_state,
      permanent_postal_code: userData.permanentPostalCode !== undefined ? userData.permanentPostalCode : existingUser.permanent_postal_code,
      experience: userData.experience !== undefined ? userData.experience : existingUser.experience,
      source_of_hire: userData.sourceOfHire !== undefined ? userData.sourceOfHire : existingUser.source_of_hire,
      skill_set: userData.skillSet !== undefined ? userData.skillSet : existingUser.skill_set,
      highest_qualification: userData.highestQualification !== undefined ? userData.highestQualification : existingUser.highest_qualification,
      additional_information: userData.additionalInformation !== undefined ? userData.additionalInformation : existingUser.additional_information,
      location: userData.location !== undefined ? userData.location : existingUser.location,
      title: userData.title !== undefined ? userData.title : existingUser.title,
      current_salary: userData.currentSalary !== undefined ? userData.currentSalary : existingUser.current_salary,
      department: userData.department !== undefined ? userData.department : existingUser.department,
      offer_letter_url: userData.offerLetterUrl !== undefined ? userData.offerLetterUrl : existingUser.offer_letter_url,
      tentative_joining_date: userData.tentativeJoiningDate !== undefined ? userData.tentativeJoiningDate : existingUser.tentative_joining_date,
      education: userData.education !== undefined ? userData.education : existingUser.education,
      work_experience: userData.workExperience !== undefined ? userData.workExperience : existingUser.work_experience,
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
      range: `${sheetName}!A${actualRowNumber}:AZ${actualRowNumber}`,
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
      range: `${sheetName}!A:AZ`,
      valueRenderOption: 'UNFORMATTED_VALUE',
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

// NOTIFICATION OPERATIONS

const NOTIFICATIONS_SHEET = 'notification'; // Default sheet name in new spreadsheet

async function ensureNotificationSheetExists(sheets: any) {
  try {
    const cacheKey = `${NOTIFICATIONS_SPREADSHEET_ID}_${NOTIFICATIONS_SHEET}`;
    if (ensuredSheets.has(cacheKey)) return;

    const headerCheck = await sheets.spreadsheets.values.get({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      range: `${NOTIFICATIONS_SHEET}!A1:I1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
        range: `${NOTIFICATIONS_SHEET}!A1:I1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['id', 'user_id', 'user_role', 'type', 'title', 'message', 'resource_id', 'target_page', 'action_by', 'is_read', 'created_at']],
        },
      });
    }
    ensuredSheets.add(cacheKey);
  } catch (error) {
    console.error('❌ Error ensuring notification sheet:', error);
    throw error;
  }
}

// Role-based notification system - Admin sees all, TL and Doer see their specific notifications
export async function getNotifications(userId: number, userRole: string, unreadOnly: boolean = false) {
  try {
    const sheets = await getGoogleSheetsClient();

    await ensureNotificationSheetExists(sheets);

    // Read all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      range: `${NOTIFICATIONS_SHEET}!A:K`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;

    if (!rows || rows.length <= 1) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    let notifications = dataRows
      .map(row => {
        const notif = rowToObject(headers, row);
        // Parse is_read properly
        if (typeof notif.is_read === 'string') {
          notif.is_read = notif.is_read.toUpperCase() === 'TRUE';
        }
        return notif;
      })
      .filter(notif => {
        const hasId = notif.id;

        // Admin sees ALL notifications
        if (userRole?.toLowerCase() === 'admin') {
          return hasId;
        }

        // TL and Doer see their specific notifications
        const matchesUser = String(notif.user_id) === String(userId);
        return hasId && matchesUser;
      });

    // Filter unread if requested
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.is_read);
    }

    // Sort by created_at descending
    notifications.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    return notifications;
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    throw error;
  }
}

export async function createNotification(notificationData: any) {
  try {
    const sheets = await getGoogleSheetsClient();

    // Get the last ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      range: `${NOTIFICATIONS_SHEET}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values || [];
    const lastId = rows.length > 1 ? Math.max(...rows.slice(1).map(row => parseInt(row[0]) || 0)) : 0;
    const newId = lastId + 1;

    const now = formatToSheetDate(new Date());

    const newRow = [
      newId,
      notificationData.user_id || '',
      notificationData.user_role || '',
      notificationData.type || 'info',
      notificationData.title || '',
      notificationData.message || '',
      notificationData.resource_id || notificationData.delegation_id || notificationData.resourceId || '',
      notificationData.target_page || '',
      notificationData.action_by || '',
      'FALSE',
      now,
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      range: `${NOTIFICATIONS_SHEET}!A:K`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [newRow],
      },
    });
    return {
      id: newId,
      ...notificationData,
      is_read: false,
      created_at: now,
    };
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      range: `${NOTIFICATIONS_SHEET}!A:I`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Notification not found');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);
    const rowIndex = dataRows.findIndex(row => parseInt(row[0]) === id);

    if (rowIndex === -1) {
      throw new Error('Notification not found');
    }

    // Update is_read to TRUE
    const isReadColIndex = headers.indexOf('is_read');
    if (isReadColIndex === -1) {
      throw new Error('is_read column not found');
    }

    const cellAddress = `${NOTIFICATIONS_SHEET}!${String.fromCharCode(65 + isReadColIndex)}${rowIndex + 2}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      range: cellAddress,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['TRUE']],
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function deleteNotification(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      range: `${NOTIFICATIONS_SHEET}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Notification not found');
    }

    const rowIndex = rows.slice(1).findIndex(row => parseInt(row[0]) === id);
    if (rowIndex === -1) {
      throw new Error('Notification not found');
    }

    // Get sheet ID
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
    });

    const sheet = sheetInfo.data.sheets?.find(s => s.properties?.title === NOTIFICATIONS_SHEET);
    if (!sheet || !sheet.properties) {
      throw new Error('Notifications sheet not found');
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex + 1,
                endIndex: rowIndex + 2,
              },
            },
          },
        ],
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

// DEPARTMENT OPERATIONS

export async function getDepartments() {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'Sheet1'; // Default sheet name

    // Read all departments from column A
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.DEPARTMENTS,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    // Get all departments from column A, filter out empty values
    const departments = rows
      .map(row => row[0])
      .filter(dept => dept && dept.trim() !== '')
      .map(dept => dept.trim());

    return departments;
  } catch (error) {
    console.error('Error fetching departments from Google Sheets:', error);
    throw error;
  }
}

export async function addDepartment(departmentName: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'Sheet1'; // Default sheet name

    // Check if department already exists
    const existingDepartments = await getDepartments();
    if (existingDepartments.some(dept => dept.toLowerCase() === departmentName.toLowerCase())) {
      throw new Error('Department already exists');
    }

    // Append the new department to column A
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS.DEPARTMENTS,
      range: `${sheetName}!A:A`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[departmentName]],
      },
    });

    return { name: departmentName };
  } catch (error) {
    console.error('Error adding department to Google Sheets:', error);
    throw error;
  }
}

export async function deleteDepartment(departmentName: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'Sheet1';

    // Read all departments
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.DEPARTMENTS,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Department not found');
    }

    // Find the row index
    const rowIndex = rows.findIndex(row => row[0] && row[0].trim().toLowerCase() === departmentName.toLowerCase());
    if (rowIndex === -1) {
      throw new Error('Department not found');
    }

    // Get sheet ID
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_IDS.DEPARTMENTS,
    });

    const sheet = sheetInfo.data.sheets?.find(s => s.properties?.title === sheetName);
    if (!sheet || !sheet.properties) {
      throw new Error('Sheet not found');
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_IDS.DEPARTMENTS,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    return { name: departmentName };
  } catch (error) {
    console.error('Error deleting department from Google Sheets:', error);
    throw error;
  }
}

// CHECKLIST CRUD OPERATIONS

// Cache to avoid repeated sheet existence checks
const ensuredSheets = new Set<string>();

// Helper function to ensure checklist sheet exists with proper headers
async function ensureChecklistSheetExists(sheets: any, spreadsheetId: string, sheetName: string) {
  try {
    const cacheKey = `${spreadsheetId}_${sheetName}`;
    if (ensuredSheets.has(cacheKey)) return;

    // Check if sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === sheetName);

    if (!sheet) {
      // Create the sheet if it doesn't exist
      console.log(`Creating ${sheetName} sheet in checklist spreadsheet...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          }],
        },
      });
    }

    // Ensure headers are present
    const defaultHeaders = [
      'id', 'question', 'assignee', 'doer_name', 'priority', 'department',
      'verification_required', 'verifier_name', 'attachment_required',
      'frequency', 'due_date', 'status', 'group_id', 'created_by',
      'created_at', 'updated_at'
    ];

    // Check if headers exist
    let headerResponse;
    try {
      headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:P1`,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });
    } catch (error) {
      headerResponse = null;
    }

    const existingHeaders = headerResponse?.data.values?.[0] || [];

    if (existingHeaders.length === 0) {
      // Create headers
      console.log('Creating checklist sheet headers...');
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:Q1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [defaultHeaders],
        },
      });
    } else {
      // Update headers if they don't match expected format
      const headersMatch = JSON.stringify(existingHeaders.slice(0, 17)) === JSON.stringify(defaultHeaders);
      if (!headersMatch) {
        console.log('Updating checklist sheet headers to match expected format...');
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1:Q1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [defaultHeaders],
          },
        });
      }
    }
    ensuredSheets.add(cacheKey);
  } catch (error) {
    console.error('Error ensuring checklist sheet exists:', error);
    // Don't throw, just log, so we can see if this is the cause but maybe proceed?
    // Actually, if this fails, getChecklists will likely fail too, but let's see the log.
    throw error;
  }
}

export async function getChecklists() {
  try {
    console.log('getChecklists: Starting...');
    const sheets = await getGoogleSheetsClient();
    console.log('getChecklists: Got sheets client');
    const sheetName = 'checklists'; // Checklist sheet name

    // Ensure sheet exists
    console.log('getChecklists: Ensuring sheet exists...');
    await ensureChecklistSheetExists(sheets, SPREADSHEET_IDS.CHECKLISTS, sheetName);
    console.log('getChecklists: Sheet ensured');

    // Read all data from the sheet
    console.log('getChecklists: Fetching values...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    console.log('getChecklists: Values fetched');

    const rows = response.data.values;

    if (!rows || rows.length === 0 || rows.length === 1) {
      // No data rows (only headers or empty)
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Convert rows to objects
    const checklists = dataRows
      .map(row => rowToObject(headers, row))
      .filter(checklist => checklist.id) // Filter out empty rows
      .map(checklist => ({
        ...checklist,
        due_date: ensureIsoDate(checklist.due_date),
        created_at: ensureIsoDate(checklist.created_at),
        updated_at: ensureIsoDate(checklist.updated_at)
      }));

    // Sort by due_date ascending, then created_at descending
    checklists.sort((a, b) => {
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return checklists;
  } catch (error) {
    console.error('Error fetching checklists from Google Sheets:', error);
    throw error;
  }
}

// Batch append multiple checklists at once (more efficient for bulk operations)
export async function createChecklistsBatch(checklistsData: any[]) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklists'; // Checklist sheet name

    // Ensure sheet exists with headers
    await ensureChecklistSheetExists(sheets, SPREADSHEET_IDS.CHECKLISTS, sheetName);

    // Read headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A1:P1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const headers = response.data.values?.[0] || [];

    // Get all existing IDs to find the maximum
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const allRows = allDataResponse.data.values || [];

    // Find the maximum ID from existing rows (skip header row)
    let maxId = 0;
    for (let i = 1; i < allRows.length; i++) {
      const id = parseInt(allRows[i][0]);
      if (!isNaN(id) && id > maxId) {
        maxId = id;
      }
    }
    let nextId = maxId + 1; // Start from max ID + 1

    // Prepare all rows with sequential IDs
    const now = new Date().toISOString();
    const rowsData = checklistsData.map(checklistData => {
      const checklist = {
        id: nextId++,
        ...checklistData,
        created_at: now,
        updated_at: now
      };
      return objectToRow(headers, checklist);
    });

    // Append all rows in a single batch operation
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rowsData,
      },
    });

    return { count: rowsData.length, firstId: maxId + 1 };
  } catch (error) {
    console.error('Error creating checklists batch in Google Sheets:', error);
    throw error;
  }
}

export async function createChecklist(checklistData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklists'; // Checklist sheet name

    // Ensure sheet exists with headers
    await ensureChecklistSheetExists(sheets, SPREADSHEET_IDS.CHECKLISTS, sheetName);

    // Read headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A1:P1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const headers = response.data.values?.[0] || [];

    // Get all existing IDs to find the maximum
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const allRows = allDataResponse.data.values || [];

    // Find the maximum ID from existing rows (skip header row)
    let maxId = 0;
    for (let i = 1; i < allRows.length; i++) {
      const id = parseInt(allRows[i][0]);
      if (!isNaN(id) && id > maxId) {
        maxId = id;
      }
    }
    const newId = maxId + 1; // Start from max ID + 1

    // Prepare checklist data with ID
    const checklist = {
      id: newId,
      ...checklistData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Convert to row array
    const rowData = objectToRow(headers, checklist);

    // Append row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });

    return checklist;
  } catch (error) {
    console.error('Error creating checklist in Google Sheets:', error);
    throw error;
  }
}

export async function updateChecklist(id: number, checklistData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklists'; // Checklist sheet name

    // Read all data to find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Checklist not found');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Find row index by ID
    const rowIndex = dataRows.findIndex(row => {
      const rowId = parseInt(row[0]);
      const searchId = typeof id === 'string' ? parseInt(id) : id;
      return rowId === searchId;
    });

    if (rowIndex === -1) {
      throw new Error('Checklist not found');
    }

    // Update the checklist object
    const existingChecklist = rowToObject(headers, dataRows[rowIndex]);
    const updatedChecklist = {
      ...existingChecklist,
      ...checklistData,
      updated_at: new Date().toISOString()
    };

    // Convert to row array
    const rowData = objectToRow(headers, updatedChecklist);

    // Update the specific row (add 2 to rowIndex: 1 for header, 1 for 0-based index)
    const actualRowNumber = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A${actualRowNumber}:Z${actualRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });

    return updatedChecklist;
  } catch (error) {
    console.error('Error updating checklist in Google Sheets:', error);
    throw error;
  }
}

export async function deleteChecklist(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklists'; // Checklist sheet name

    // Read all data to find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Checklist not found');
    }

    const dataRows = rows.slice(1);
    const rowIndex = dataRows.findIndex(row => parseInt(row[0]) === id);

    if (rowIndex === -1) {
      throw new Error('Checklist not found');
    }

    // Get sheet ID
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
    });

    const sheet = sheetInfo.data.sheets?.find(s => s.properties?.title === sheetName);
    if (!sheet || !sheet.properties) {
      throw new Error('Checklists sheet not found');
    }

    // Delete the row (add 2 to rowIndex: 1 for header, 1 for 0-based index)
    const actualRowNumber = rowIndex + 2;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
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
    console.error('Error deleting checklist from Google Sheets:', error);
    throw error;
  }
}

// Update all checklists with a specific group_id
export async function updateChecklistsByGroupId(groupId: string, checklistData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklists'; // Checklist sheet name

    // Read all data to find the rows with matching group_id
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { updated: 0 };
    }

    const headers = rows[0];
    const groupIdIndex = headers.indexOf('group_id');

    if (groupIdIndex === -1) {
      throw new Error('group_id column not found');
    }

    const dataRows = rows.slice(1);
    const rowsToUpdate: Array<{ rowNumber: number; data: any[] }> = [];

    // Find all rows with matching group_id and prepare updates
    dataRows.forEach((row, index) => {
      if (row[groupIdIndex] === groupId) {
        const existingChecklist = rowToObject(headers, row);
        const updatedChecklist = {
          ...existingChecklist,
          ...checklistData,
          updated_at: new Date().toISOString()
        };
        const rowData = objectToRow(headers, updatedChecklist);
        rowsToUpdate.push({
          rowNumber: index + 2, // +2 for header row and 1-based index
          data: rowData
        });
      }
    });

    if (rowsToUpdate.length === 0) {
      return { updated: 0 };
    }

    // Update all matching rows
    const updatePromises = rowsToUpdate.map(({ rowNumber, data }) =>
      sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
        range: `${sheetName}!A${rowNumber}:Z${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [data],
        },
      })
    );

    await Promise.all(updatePromises);

    return { updated: rowsToUpdate.length };
  } catch (error) {
    console.error('Error updating checklists by group_id from Google Sheets:', error);
    throw error;
  }
}

// Delete all checklists with a specific group_id
export async function deleteChecklistsByGroupId(groupId: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklists'; // Checklist sheet name

    // Read all data to find the rows with matching group_id
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { deleted: 0 };
    }

    const headers = rows[0];
    const groupIdIndex = headers.indexOf('group_id');

    if (groupIdIndex === -1) {
      throw new Error('group_id column not found');
    }

    const dataRows = rows.slice(1);
    const rowsToDelete: number[] = [];

    // Find all rows with matching group_id
    dataRows.forEach((row, index) => {
      if (row[groupIdIndex] === groupId) {
        rowsToDelete.push(index + 2); // +2 for header row and 1-based index
      }
    });

    if (rowsToDelete.length === 0) {
      return { deleted: 0 };
    }

    // Get sheet ID
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
    });

    const sheet = sheetInfo.data.sheets?.find(s => s.properties?.title === sheetName);
    if (!sheet || !sheet.properties) {
      throw new Error('Checklists sheet not found');
    }

    // Delete rows in reverse order to maintain correct indices
    const requests = rowsToDelete
      .sort((a, b) => b - a) // Sort descending
      .map(rowNumber => ({
        deleteDimension: {
          range: {
            sheetId: sheet.properties!.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber
          }
        }
      }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      requestBody: { requests }
    });

    return { deleted: rowsToDelete.length };
  } catch (error) {
    console.error('Error deleting checklists by group_id from Google Sheets:', error);
    throw error;
  }
}


// Checklist helper functions
export async function getChecklistById(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklists';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      console.log('No checklist data found in sheet');
      return null;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    console.log(`Searching for checklist with ID: ${id}`);
    console.log(`Total checklists in sheet: ${dataRows.length}`);

    const checklist = dataRows
      .map(row => rowToObject(headers, row))
      .find(c => {
        const checklistId = parseInt(c.id);
        const searchId = typeof id === 'string' ? parseInt(id) : id;
        console.log(`Comparing checklist ID ${checklistId} with search ID ${searchId}`);
        return checklistId === searchId;
      });

    if (!checklist) {
      console.log(`Checklist with ID ${id} not found`);
    } else {
      console.log(`Found checklist:`, checklist);
    }

    return checklist || null;
  } catch (error) {
    console.error('Error fetching checklist by ID:', error);
    throw error;
  }
}

export async function getChecklistRemarks(checklistId: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklist_remarks';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
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
      .filter(remark => parseInt(remark.checklist_id) === checklistId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return remarks;
  } catch (error) {
    console.error('Error fetching checklist remarks from Google Sheets:', error);
    throw error;
  }
}

export async function createChecklistRemark(remarkData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklist_remarks';

    // Ensure sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
    });

    const sheet = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === sheetName);

    if (!sheet) {
      // Create the sheet if it doesn't exist
      console.log(`Creating ${sheetName} sheet...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          }],
        },
      });
    }

    // Read headers
    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
        range: `${sheetName}!A1:Z1`,
      });
    } catch (error) {
      response = { data: { values: [] } };
    }

    const headers = response.data.values?.[0] || [];

    // If no headers, initialize the sheet
    if (headers.length === 0) {
      const defaultHeaders = ['id', 'checklist_id', 'user_id', 'username', 'remark', 'created_at'];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
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
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:A`,
    });
    const allRows = allDataResponse.data.values || [];
    const newId = allRows.length;

    const remark = {
      id: newId,
      ...remarkData,
      created_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, remark);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });

    return remark;
  } catch (error) {
    console.error('Error creating checklist remark in Google Sheets:', error);
    throw error;
  }
}

export async function createChecklistHistory(historyData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklist_revision_history';

    // Ensure sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
    });

    const sheet = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === sheetName);

    if (!sheet) {
      // Create the sheet if it doesn't exist
      console.log(`Creating ${sheetName} sheet...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          }],
        },
      });
    }

    // Read headers
    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
        range: `${sheetName}!A1:Z1`,
      });
    } catch (error) {
      response = { data: { values: [] } };
    }

    const headers = response.data.values?.[0] || [];

    // If no headers, initialize the sheet
    if (headers.length === 0) {
      const defaultHeaders = [
        'id', 'checklist_id', 'user_id', 'username', 'action',
        'old_status', 'new_status', 'remark', 'attachment_url', 'timestamp'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
        range: `${sheetName}!A1:J1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [defaultHeaders],
        },
      });

      headers.push(...defaultHeaders);
    }

    // Generate ID
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:A`,
    });
    const allRows = allDataResponse.data.values || [];
    const newId = allRows.length;

    const history = {
      id: newId,
      ...historyData
    };

    const rowData = objectToRow(headers, history);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });

    return history;
  } catch (error) {
    console.error('Error creating checklist history in Google Sheets:', error);
    throw error;
  }
}

export async function getChecklistIdsWithHistory(): Promise<Set<number>> {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklist_revision_history';

    // Check if sheet exists first (optimistic check) to avoid errors
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
        range: `${sheetName}!B:B`, // Column B is checklist_id based on createChecklistHistory
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return new Set();
      }

      // Skip header (row 0) and filter valid IDs
      const ids = new Set<number>();
      for (let i = 1; i < rows.length; i++) {
        const id = parseInt(rows[i][0]);
        if (!isNaN(id)) {
          ids.add(id);
        }
      }
      return ids;
    } catch (error) {
      // If sheet doesn't exist or other error, return empty set
      return new Set();
    }
  } catch (error) {
    console.error('Error fetching checklist IDs with history:', error);
    return new Set();
  }
}

// HELPDESK CRUD OPERATIONS

// Cache to avoid repeated sheet existence checks

// Helper function to ensure helpdesk sheet exists with proper headers
async function ensureHelpdeskSheetExists(sheets: any, spreadsheetId: string, sheetName: string) {
  try {
    const cacheKey = `${spreadsheetId}_${sheetName}`;
    if (ensuredSheets.has(cacheKey)) return;

    // Check if sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === sheetName);

    if (!sheet) {
      // Create the sheet if it doesn't exist
      console.log(`Creating ${sheetName} sheet in helpdesk spreadsheet...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          }],
        },
      });
    }

    // Ensure headers are present
    const defaultHeaders = [
      'id', 'ticket_number', 'raised_by', 'raised_by_name', 'category', 'priority',
      'subject', 'description', 'assigned_to', 'assigned_to_name', 'accountable_person',
      'accountable_person_name', 'desired_date', 'status', 'attachments', 'remarks',
      'created_at', 'updated_at', 'resolved_at'
    ];

    // Check if headers exist
    let headerResponse;
    try {
      headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:S1`,
      });
    } catch (error) {
      headerResponse = null;
    }

    const existingHeaders = headerResponse?.data.values?.[0] || [];

    if (existingHeaders.length === 0) {
      // Create headers
      console.log('Creating helpdesk sheet headers...');
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:S1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [defaultHeaders],
        },
      });
    }
    ensuredSheets.add(cacheKey);
  } catch (error) {
    console.error('Error ensuring helpdesk sheet exists:', error);
    throw error;
  }
}

export async function getHelpdeskTickets(filters: any = {}) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'tickets'; // Helpdesk sheet name

    // Ensure sheet exists
    await ensureHelpdeskSheetExists(sheets, SPREADSHEET_IDS.HELPDESK, sheetName);

    // Read all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0 || rows.length === 1) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Convert rows to objects
    let tickets = dataRows
      .map(row => rowToObject(headers, row))
      .filter(ticket => ticket.id); // Filter out empty rows

    // Apply filters
    if (filters.status) {
      tickets = tickets.filter(t => t.status === filters.status);
    }
    if (filters.assignedTo) {
      tickets = tickets.filter(t => parseInt(t.assigned_to) === parseInt(filters.assignedTo));
    }
    if (filters.userId) {
      tickets = tickets.filter(t => parseInt(t.raised_by) === parseInt(filters.userId) || parseInt(t.assigned_to) === parseInt(filters.userId));
    }

    // Sort by created_at descending
    tickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return tickets;
  } catch (error) {
    console.error('Error fetching helpdesk tickets from Google Sheets:', error);
    throw error;
  }
}

export async function createHelpdeskTicket(ticketData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'tickets';

    // Ensure sheet exists
    await ensureHelpdeskSheetExists(sheets, SPREADSHEET_IDS.HELPDESK, sheetName);

    // Read headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
      range: `${sheetName}!A1:S1`,
    });

    const headers = response.data.values?.[0] || [];

    // Get all existing IDs to find the maximum
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
      range: `${sheetName}!A:A`,
    });
    const allRows = allDataResponse.data.values || [];

    let maxId = 0;
    for (let i = 1; i < allRows.length; i++) {
      const id = parseInt(allRows[i][0]);
      if (!isNaN(id) && id > maxId) {
        maxId = id;
      }
    }
    const newId = maxId + 1;

    // Prepare ticket data
    const ticket = {
      id: newId,
      ...ticketData,
      created_at: formatToSheetDate(new Date()),
      updated_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, ticket);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });

    return ticket;
  } catch (error) {
    console.error('Error creating helpdesk ticket in Google Sheets:', error);
    throw error;
  }
}

export async function updateHelpdeskTicket(id: number, ticketData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'tickets';

    // Read all data to find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Ticket not found');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Find row index
    const rowIndex = dataRows.findIndex(row => parseInt(row[0]) === id);

    if (rowIndex === -1) {
      throw new Error('Ticket not found');
    }

    // Update the ticket object
    const existingTicket = rowToObject(headers, dataRows[rowIndex]);
    const updatedTicket = {
      ...existingTicket,
      ...ticketData,
      updated_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, updatedTicket);

    const actualRowNumber = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
      range: `${sheetName}!A${actualRowNumber}:Z${actualRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });

    return updatedTicket;
  } catch (error) {
    console.error('Error updating helpdesk ticket in Google Sheets:', error);
    throw error;
  }
}

export async function deleteHelpdeskTicket(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'tickets';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Ticket not found');
    }

    const dataRows = rows.slice(1);
    const rowIndex = dataRows.findIndex(row => parseInt(row[0]) === id);

    if (rowIndex === -1) {
      throw new Error('Ticket not found');
    }

    // Get sheet ID
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
    });

    const sheet = sheetInfo.data.sheets?.find((s: any) => s.properties?.title === sheetName);
    if (!sheet || !sheet.properties) {
      throw new Error('Tickets sheet not found');
    }

    const actualRowNumber = rowIndex + 2;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
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
    console.error('Error deleting helpdesk ticket from Google Sheets:', error);
    throw error;
  }
}

export async function createHelpdeskRemark(remarkData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'ticket_remarks';

    // Ensure sheet exists (simplified check)
    try {
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_IDS.HELPDESK,
        range: `${sheetName}!A1:A1`,
      });
    } catch (e) {
      // Create sheet if not accessible
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_IDS.HELPDESK,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }]
        }
      });
      // Add headers
      const defaultHeaders = ['id', 'ticket_id', 'user_id', 'username', 'remark', 'created_at'];
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_IDS.HELPDESK,
        range: `${sheetName}!A1:F1`,
        valueInputOption: 'RAW',
        requestBody: { values: [defaultHeaders] }
      });
    }

    // Get headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
      range: `${sheetName}!A1:Z1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const headers = response.data.values?.[0] || [];

    // Get max ID
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const nextId = (allData.data.values?.length || 0) + 1; // Basic ID strategy

    const finalRemark = {
      id: nextId,
      ticket_id: remarkData.ticketId,
      user_id: remarkData.userId,
      username: remarkData.userName,
      remark: remarkData.remark,
      created_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, finalRemark);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS.HELPDESK,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: { values: [rowData] }
    });

    return finalRemark;

  } catch (error) {
    console.error('Error creating helpdesk remark:', error);
    throw error;
  }
}

export async function getHelpdeskRemarks(ticketId: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'ticket_remarks';

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_IDS.HELPDESK,
        range: `${sheetName}!A:Z`,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });
      const rows = response.data.values;
      if (!rows || rows.length < 2) return [];

      const headers = rows[0];
      const dataRows = rows.slice(1);

      return dataRows
        .map(row => rowToObject(headers, row))
        .filter(r => parseInt(r.ticket_id) === ticketId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // Ascending for chat
    } catch (e) {
      return [];
    }
  } catch (error) {
    console.error('Error fetching remarks:', error);
    return [];
  }
}


// TODO CRUD OPERATIONS


async function ensureTodoSheetExists(sheets: any, spreadsheetId: string, sheetName: string) {
  try {
    const cacheKey = `${spreadsheetId}_${sheetName}`;
    if (ensuredSheets.has(cacheKey)) return;

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === sheetName);

    if (!sheet) {
      console.log(`Creating ${sheetName} sheet in todo spreadsheet...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          }],
        },
      });
    }

    const defaultHeaders = [
      'id', 'title', 'description', 'priority', 'status', 'category',
      'is_important', 'assigned_to', 'user_id', 'created_at', 'updated_at'
    ];

    let headerResponse;
    try {
      headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:K1`,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });
    } catch (error) {
      headerResponse = null;
    }

    const existingHeaders = headerResponse?.data.values?.[0] || [];

    if (existingHeaders.length === 0) {
      console.log('Creating todo sheet headers...');
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:K1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [defaultHeaders],
        },
      });
    }
    ensuredSheets.add(cacheKey);
  } catch (error) {
    console.error('Error ensuring todo sheet exists:', error);
    throw error;
  }
}

export async function getTodos(filters: any = {}) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'todos';

    await ensureTodoSheetExists(sheets, SPREADSHEET_IDS.TODOS, sheetName);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.TODOS,
      range: `${sheetName}!A:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0 || rows.length === 1) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    let todos = dataRows
      .map(row => rowToObject(headers, row))
      .filter(todo => todo.id);

    // Sort
    todos.sort((a, b) => {
      // Importance check (boolean string or actual boolean)
      const isImportantA = String(a.is_important).toLowerCase() === 'true';
      const isImportantB = String(b.is_important).toLowerCase() === 'true';

      if (isImportantA !== isImportantB) return isImportantA ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return todos;
  } catch (error) {
    console.error('Error fetching todos:', error);
    throw error;
  }
}

export async function createTodo(todoData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'todos';

    await ensureTodoSheetExists(sheets, SPREADSHEET_IDS.TODOS, sheetName);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.TODOS,
      range: `${sheetName}!A1:K1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const headers = response.data.values?.[0] || [];

    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.TODOS,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const allRows = allDataResponse.data.values || [];

    let maxId = 0;
    for (let i = 1; i < allRows.length; i++) {
      const id = parseInt(allRows[i][0]);
      if (!isNaN(id) && id > maxId) maxId = id;
    }
    const newId = maxId + 1;

    const todo = {
      id: newId,
      ...todoData,
      is_important: todoData.is_important || false, // Ensure boolean default
      created_at: formatToSheetDate(new Date()),
      updated_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, todo);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS.TODOS,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });

    return todo;
  } catch (error) {
    console.error('Error creating todo:', error);
    throw error;
  }
}

export async function updateTodo(id: number, todoData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'todos';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.TODOS,
      range: `${sheetName}!A:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) throw new Error('Todo not found');

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const rowIndex = dataRows.findIndex(row => parseInt(row[0]) === id);
    if (rowIndex === -1) throw new Error('Todo not found');

    const existingTodo = rowToObject(headers, dataRows[rowIndex]);
    const updatedTodo = {
      ...existingTodo,
      ...todoData,
      updated_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, updatedTodo);
    const actualRowNumber = rowIndex + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_IDS.TODOS,
      range: `${sheetName}!A${actualRowNumber}:Z${actualRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });

    return updatedTodo;
  } catch (error) {
    console.error('Error updating todo:', error);
    throw error;
  }
}

export async function deleteTodo(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'todos';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.TODOS,
      range: `${sheetName}!A:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) throw new Error('Todo not found');

    const dataRows = rows.slice(1);
    const rowIndex = dataRows.findIndex(row => parseInt(row[0]) === id);
    if (rowIndex === -1) throw new Error('Todo not found');

    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_IDS.TODOS });
    const sheet = sheetInfo.data.sheets?.find((s: any) => s.properties?.title === sheetName);
    if (!sheet || !sheet.properties) throw new Error('Todo sheet not found');

    const actualRowNumber = rowIndex + 2;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_IDS.TODOS,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: actualRowNumber - 1,
              endIndex: actualRowNumber
            }
          }
        }]
      }
    });

    return { id };
  } catch (error) {
    console.error('Error deleting todo:', error);
    throw error;
  }
}


// CHAT MESSAGE OPERATIONS

async function ensureChatMessagesSheetExists(sheets: any, spreadsheetId: string, sheetName: string) {
  try {
    const cacheKey = `${spreadsheetId}_${sheetName}`;
    if (ensuredSheets.has(cacheKey)) return;

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === sheetName);

    if (!sheet) {
      console.log(`Creating ${sheetName} sheet in chat spreadsheet...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          }],
        },
      });
    }

    const defaultHeaders = [
      'id', 'sender_id', 'sender_name', 'receiver_id', 'message',
      'message_type', 'attachment_url', 'attachment_type', 'duration_ms', 'created_at'
    ];

    let headerResponse;
    try {
      headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:J1`,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });
    } catch (error) {
      headerResponse = null;
    }

    const existingHeaders = headerResponse?.data.values?.[0] || [];

    if (existingHeaders.length === 0) {
      console.log('Creating chat message sheet headers...');
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:J1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [defaultHeaders],
        },
      });
    }
    ensuredSheets.add(cacheKey);
  } catch (error) {
    console.error('Error ensuring chat message sheet exists:', error);
    throw error;
  }
}

export async function getChatMessages() {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.CHAT_MESSAGES;

    await ensureChatMessagesSheetExists(sheets, SPREADSHEET_IDS.CHAT, sheetName);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHAT,
      range: `${sheetName}!A:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const messages = dataRows
      .map(row => rowToObject(headers, row))
      .filter(msg => msg.id);

    // Sort by created_at ascending for chat history
    messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return messages;
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    throw error;
  }
}

export async function createChatMessage(messageData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.CHAT_MESSAGES;

    await ensureChatMessagesSheetExists(sheets, SPREADSHEET_IDS.CHAT, sheetName);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHAT,
      range: `${sheetName}!A1:J1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const headers = response.data.values?.[0] || [];

    const idResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHAT,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const allRows = idResponse.data.values || [];

    let maxId = 0;
    for (let i = 1; i < allRows.length; i++) {
      const id = parseInt(allRows[i][0]);
      if (!isNaN(id) && id > maxId) maxId = id;
    }
    const newId = maxId + 1;

    const message = {
      id: newId,
      ...messageData,
      created_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, message);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS.CHAT,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData],
      },
    });

    return message;
  } catch (error) {
    console.error('Error creating chat message:', error);
    throw error;
  }
}

// NBD CRUD OPERATIONS

export async function getNBDs() {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.NBD;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const nbds = dataRows
      .map(row => rowToObject(headers, row))
      .filter(n => n.id)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return nbds;
  } catch (error) {
    console.error('Error fetching NBDs:', error);
    throw error;
  }
}

export async function createNBD(data: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.NBD;

    // Check headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    let headers = response.data.values?.[0] || [];

    if (headers.length === 0) {
      const defaultHeaders = [
        'id', 'party_name', 'type', 'contact_person', 'email', 'contact_no_1', 'contact_no_2',
        'location', 'state', 'stage', 'tat_days', 'field_person_name', 'remarks', 'created_at', 'updated_at'
      ];
      await sheets.spreadsheets.values.update({
        spreadsheetId: NBD_SPREADSHEET_ID,
        range: `${sheetName}!A1:O1`,
        valueInputOption: 'RAW',
        requestBody: { values: [defaultHeaders] },
      });
      headers = defaultHeaders;
    }

    // Generate ID
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const newId = (allData.data.values || []).length;

    const newNBD = {
      id: newId,
      ...data,
      created_at: formatToSheetDate(new Date()),
      updated_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, newNBD);

    await sheets.spreadsheets.values.append({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: { values: [rowData] },
    });

    return newNBD;
  } catch (error) {
    console.error('Error creating NBD:', error);
    throw error;
  }
}

export async function updateNBD(id: number, data: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.NBD;

    const headersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const headers = headersRes.data.values?.[0];
    if (!headers) throw new Error('Headers not found');

    const idRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const ids = idRes.data.values || [];
    const rowIndex = ids.findIndex(row => parseInt(row[0]) == id);

    if (rowIndex === -1) throw new Error('NBD not found');
    const actualRow = rowIndex + 1;

    // Fetch existing
    const rowRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRow}:Z${actualRow}`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const existing = rowToObject(headers, rowRes.data.values?.[0] || []);

    const updated = {
      ...existing,
      ...data,
      updated_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, updated);

    await sheets.spreadsheets.values.update({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRow}:Z${actualRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [rowData] },
    });

    return updated;
  } catch (error) {
    console.error('Error updating NBD:', error);
    throw error;
  }
}

export async function deleteNBD(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.NBD;

    const idRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const ids = idRes.data.values || [];
    const rowIndex = ids.findIndex(row => parseInt(row[0]) == id);

    if (rowIndex === -1) throw new Error('NBD not found');

    // Add 1 for 1-based index
    const actualRow = rowIndex + 1;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: NBD_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: 0, // Assumption: NBD is the first/only sheet.
              dimension: 'ROWS',
              startIndex: actualRow - 1,
              endIndex: actualRow
            }
          }
        }]
      }
    });

    return { id };
  } catch (error) {
    console.error('Error deleting NBD:', error);
    throw error;
  }
}

// O2D (Order to Delivery) OPERATIONS

export async function getO2DOrders() {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.O2D;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A:AZ`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const flatOrders = dataRows
      .map(row => rowToObject(headers, row))
      .filter(o => o.id);

    // Group by party_id
    const groupedMap = new Map<string, any>();

    flatOrders.forEach(row => {
      const pid = String(row.party_id);
      if (!groupedMap.has(pid)) {
        groupedMap.set(pid, {
          ...row,
          party_id: pid,
          id: parseInt(row.id),
          items: []
        });
        delete groupedMap.get(pid).item;
        delete groupedMap.get(pid).quantity;
      }
      groupedMap.get(pid).items.push({
        ...row,
        id: parseInt(row.id),
        item: row.item,
        qty: row.quantity
      });
    });

    const orders = Array.from(groupedMap.values())
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return orders;
  } catch (error) {
    console.error('Error fetching O2D orders:', error);
    throw error;
  }
}

export async function createO2DOrder(orderData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.O2D;

    // Check headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A1:AZ1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    let headers = headerResponse.data.values?.[0] || [];

    if (headers.length === 0) {
      const defaultHeaders = [
        'id', 'party_id', 'party_name', 'type', 'contact_person', 'email', 'contact_no_1', 'contact_no_2',
        'location', 'state', 'field_person_name', 'item', 'quantity', 'created_at',
        'Planned_1', 'Actual_1', 'Destination',
        'Planned_2', 'Actual_2', 'Stock Availability',
        'Planned_3', 'Actual_3', 'Production Status',
        'Planned_4', 'Actual_4', 'Information Status',
        'Planned_5', 'Actual_5', 'Status_5',
        'Planned_6', 'Actual_6', 'Dispatch Status',
        'Planned_7', 'Actual_7', 'Bill No.', 'Revenue', 'Item Cost', 'Total Cost',
        'Planned_8', 'Actual_8', 'Status_8'
      ];
      await sheets.spreadsheets.values.update({
        spreadsheetId: O2D_SPREADSHEET_ID,
        range: `${sheetName}!A1:AZ1`,
        valueInputOption: 'RAW',
        requestBody: { values: [defaultHeaders] },
      });
      headers = defaultHeaders;
    }

    // Generate Global ID and Party ID
    const allIdsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A:B`, // A is id, B is party_id
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const rows = allIdsResponse.data.values || [];

    // Max Global ID for rows
    let maxId = 0;
    // Max Party ID
    let maxPartyId = 0;

    if (rows.length > 1) {
      rows.slice(1).forEach(r => {
        const id = parseInt(r[0]);
        const pid = parseInt(r[1]);
        if (!isNaN(id)) maxId = Math.max(maxId, id);
        if (!isNaN(pid)) maxPartyId = Math.max(maxPartyId, pid);
      });
    }

    const newPartyId = maxPartyId + 1;
    const createdAt = formatToSheetDate(new Date());

    const { items, ...partyDetails } = orderData;
    const rowsToInsert: any[][] = [];

    items.forEach((itemObj: any, index: number) => {
      const newRow = {
        ...partyDetails,
        id: maxId + 1 + index,
        party_id: newPartyId,
        item: itemObj.item,
        quantity: itemObj.qty,
        created_at: createdAt
      };
      rowsToInsert.push(objectToRow(headers, newRow));
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A:AZ`,
      valueInputOption: 'RAW',
      requestBody: { values: rowsToInsert },
    });

    return { ...orderData, party_id: newPartyId, created_at: createdAt };
  } catch (error) {
    console.error('Error creating O2D order:', error);
    throw error;
  }
}

export async function updateO2DOrder(partyId: number, orderData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.O2D;

    const headersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A1:AZ1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const headers = headersRes.data.values?.[0];
    if (!headers) throw new Error('Headers not found');

    // Find all rows with this party_id
    const idRes = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!B:B`, // B is party_id
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const ids = idRes.data.values || [];

    const rowIndices: number[] = [];
    ids.forEach((row, index) => {
      if (parseInt(row[0]) === partyId) {
        rowIndices.push(index);
      }
    });

    if (rowIndices.length === 0) throw new Error('O2D Order not found');

    // We can't easily "update" multiple rows that might have changed in count
    // safer approach: delete existing rows and insert new ones with SAME party_id

    // Remember the first row index for insertion
    const firstRowIndex = Math.min(...rowIndices);

    // Fetch existing rows before deletion to preserve follow-up data
    const preservedItemsMap = new Map<number, any>();
    for (const idx of rowIndices) {
      const actualRow = idx + 1;
      const rowRes = await sheets.spreadsheets.values.get({
        spreadsheetId: O2D_SPREADSHEET_ID,
        range: `${sheetName}!A${actualRow}:AZ${actualRow}`,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });
      const rowData = rowToObject(headers, rowRes.data.values?.[0] || []);
      if (rowData.id) {
        preservedItemsMap.set(parseInt(rowData.id), rowData);
      }
    }

    // Sort indices descending for deletion
    const sortedIndices = [...rowIndices].sort((a, b) => b - a);

    const sheetId = await getSheetId(sheets, O2D_SPREADSHEET_ID, sheetName);

    // Delete existing items
    const deleteRequests = sortedIndices.map(idx => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: idx,
          endIndex: idx + 1
        }
      }
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: O2D_SPREADSHEET_ID,
      requestBody: { requests: deleteRequests }
    });

    // Re-insert new items at the original position
    const { items, ...partyDetails } = orderData;

    // Get new max row id
    const allIdsAfterDelete = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const newIdRows = allIdsAfterDelete.data.values || [];
    let maxId = 0;
    if (newIdRows.length > 1) {
      maxId = Math.max(...newIdRows.slice(1).map(row => parseInt(row[0]) || 0));
    }

    const rowsToInsert: any[][] = [];
    const createdAt = orderData.created_at || formatToSheetDate(new Date());

    // Define fields to preserve
    const PRESERVED_FIELDS = [
      'Planned_1', 'Actual_1', 'Destination',
      'Planned_2', 'Actual_2', 'Stock Availability',
      'Planned_3', 'Actual_3', 'Production Status',
      'Planned_4', 'Actual_4', 'Information Status',
      'Planned_5', 'Actual_5', 'Status_5',
      'Planned_6', 'Actual_6', 'Dispatch Status',
      'Planned_7', 'Actual_7', 'Bill No.', 'Revenue', 'Item Cost', 'Total Cost',
      'Planned_8', 'Actual_8', 'Status_8'
    ];

    let currentMaxId = maxId;

    items.forEach((itemObj: any, index: number) => {
      let finalId = itemObj.id;
      let existingItem = null;

      // Check if item exists in reserved map (using ID)
      if (finalId && preservedItemsMap.has(parseInt(finalId))) {
        existingItem = preservedItemsMap.get(parseInt(finalId));
        finalId = parseInt(finalId);
      } else {
        // New item or temp ID, assign new global ID
        currentMaxId++;
        finalId = currentMaxId;
      }

      const newRow = {
        ...partyDetails,
        id: finalId,
        party_id: partyId,
        item: itemObj.item,
        quantity: itemObj.qty,
        created_at: existingItem ? existingItem.created_at : createdAt
      };

      // Merge preserved fields if existing item found
      if (existingItem) {
        PRESERVED_FIELDS.forEach(field => {
          if (existingItem[field] !== undefined && existingItem[field] !== null && existingItem[field] !== '') {
            newRow[field] = existingItem[field];
          }
        });
      }

      rowsToInsert.push(objectToRow(headers, newRow));
    });

    // Insert rows at the original position using insertDimension + update
    if (rowsToInsert.length > 0) {
      // First, insert empty rows at the original position
      const insertRequests = [{
        insertDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: firstRowIndex,
            endIndex: firstRowIndex + rowsToInsert.length
          }
        }
      }];

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: O2D_SPREADSHEET_ID,
        requestBody: { requests: insertRequests }
      });

      // Then update those rows with the new data
      const updateRange = `${sheetName}!A${firstRowIndex + 1}:AZ${firstRowIndex + rowsToInsert.length}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: O2D_SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: { values: rowsToInsert },
      });
    }

    return { ...orderData, party_id: partyId };
  } catch (error) {
    console.error('Error updating O2D order:', error);
    throw error;
  }
}

export async function deleteO2DOrder(partyId: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.O2D;

    const idRes = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!B:B`, // B is party_id
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const ids = idRes.data.values || [];

    const rowIndices: number[] = [];
    ids.forEach((row, index) => {
      if (parseInt(row[0]) === partyId) {
        rowIndices.push(index);
      }
    });

    if (rowIndices.length === 0) throw new Error('O2D Order not found');

    const sortedIndices = [...rowIndices].sort((a, b) => b - a);
    const sheetId = await getSheetId(sheets, O2D_SPREADSHEET_ID, sheetName);

    const requests = sortedIndices.map(idx => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: idx,
          endIndex: idx + 1
        }
      }
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: O2D_SPREADSHEET_ID,
      requestBody: { requests }
    });

    return { partyId };
  } catch (error) {
    console.error('Error deleting O2D order:', error);
    throw error;
  }
}

// Surgical update for follow-up steps (fixes data loss bug)
export async function updateO2DFollowUp(partyId: number, followUpData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.O2D;

    // Get headers
    const headersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A1:AZ1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const headers = headersRes.data.values?.[0];
    if (!headers) throw new Error('Headers not found');

    // Find all rows with this party_id
    const idRes = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!B:B`, // B is party_id
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const ids = idRes.data.values || [];

    const rowIndices: number[] = [];
    ids.forEach((row, index) => {
      if (parseInt(row[0]) === partyId) {
        rowIndices.push(index);
      }
    });

    if (rowIndices.length === 0) throw new Error('O2D Order not found');

    // Update each row matching the partyId
    const updates = await Promise.all(rowIndices.map(async (idx) => {
      const actualRow = idx + 1;

      // Get existing row data to preserve non-update fields
      const rowRes = await sheets.spreadsheets.values.get({
        spreadsheetId: O2D_SPREADSHEET_ID,
        range: `${sheetName}!A${actualRow}:AZ${actualRow}`,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });

      const existing = rowToObject(headers, rowRes.data.values?.[0] || []);

      // Calculate Total Cost if Item Cost is provided
      const itemCost = followUpData['Item Cost'] || existing['Item Cost'];
      const qty = existing.quantity || 0;
      let totalCost = existing['Total Cost'];

      if (itemCost !== undefined && itemCost !== null && itemCost !== '') {
        const costNum = parseFloat(itemCost);
        const qtyNum = parseFloat(qty);
        if (!isNaN(costNum) && !isNaN(qtyNum)) {
          totalCost = (costNum * qtyNum).toString();
        }
      } else if (itemCost === '' || itemCost === null) {
        totalCost = '';
      }

      // Only merge follow-up related fields from followUpData
      const updated = {
        ...existing,
        ...followUpData,
        'Total Cost': totalCost,
        id: existing.id,
        party_id: existing.party_id,
        item: existing.item,
        quantity: existing.quantity,
        created_at: existing.created_at
      };

      const rowData = objectToRow(headers, updated);

      return {
        range: `${sheetName}!A${actualRow}:AZ${actualRow}`,
        values: [rowData]
      };
    }));

    // Batch update all matching rows
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: O2D_SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: updates
      }
    });

    return { partyId, ...followUpData };
  } catch (error) {
    console.error('Error updating O2D follow-up:', error);
    throw error;
  }
}

// Delete a single O2D item by row ID (for Details view)
export async function deleteO2DItem(itemId: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.O2D;

    // Find the row with this ID
    const idRes = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A:A`, // A is id
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const ids = idRes.data.values || [];

    const rowIndex = ids.findIndex(row => parseInt(row[0]) === itemId);

    if (rowIndex === -1) throw new Error('O2D Item not found');

    const sheetId = await getSheetId(sheets, O2D_SPREADSHEET_ID, sheetName);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: O2D_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      }
    });

    return { itemId };
  } catch (error) {
    console.error('Error deleting O2D item:', error);
    throw error;
  }
}

// Update a single O2D item by row ID (for Details view)
export async function updateO2DItem(itemId: number, itemData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.O2D;

    // Get headers
    const headersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A1:AZ1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const headers = headersRes.data.values?.[0];
    if (!headers) throw new Error('Headers not found');

    // Find the row with this ID
    const idRes = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const ids = idRes.data.values || [];
    const rowIndex = ids.findIndex(row => parseInt(row[0]) === itemId);

    if (rowIndex === -1) throw new Error('O2D Item not found');
    const actualRow = rowIndex + 1;

    // Get existing row data
    const rowRes = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRow}:AZ${actualRow}`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const existing = rowToObject(headers, rowRes.data.values?.[0] || []);

    // Calculate Total Cost if Item Cost is provided
    const itemCost = itemData['Item Cost'] || existing['Item Cost'];
    const qty = existing.quantity || 0;
    let totalCost = existing['Total Cost'];

    if (itemCost !== undefined && itemCost !== null && itemCost !== '') {
      const costNum = parseFloat(itemCost);
      const qtyNum = parseFloat(qty);
      if (!isNaN(costNum) && !isNaN(qtyNum)) {
        totalCost = (costNum * qtyNum).toString();
      }
    } else if (itemCost === '' || itemCost === null) {
      totalCost = '';
    }

    // Update all provided fields, keep id and party_id unchanged
    const updated = {
      ...existing,
      ...itemData,
      'Total Cost': totalCost,
      id: existing.id, // Preserve original id
      party_id: existing.party_id, // Preserve original party_id
      created_at: existing.created_at, // Preserve original created_at
      // Map qty to quantity if provided
      quantity: itemData.qty || itemData.quantity || existing.quantity,
    };

    const rowData = objectToRow(headers, updated);

    await sheets.spreadsheets.values.update({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRow}:AZ${actualRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [rowData] },
    });

    return updated;
  } catch (error) {
    console.error('Error updating O2D item:', error);
    throw error;
  }
}

// Helper for getting sheet ID (required for batchUpdate deleteDimension)
async function getSheetId(sheets: any, spreadsheetId: string, sheetTitle: string) {
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = response.data.sheets?.find((s: any) => s.properties?.title === sheetTitle);
  return sheet?.properties?.sheetId || 0;
}

// Get costing items from Costing sheet
export async function getCostingItems() {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'Costing';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A2:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.map(row => row[0]).filter(item => item && item.trim() !== '');
  } catch (error) {
    console.error('Error fetching costing items:', error);
    return [];
  }
}

// NBD INCOMING CRUD OPERATIONS

export async function getNBDIncomings() {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.NBD_INCOMING;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const nbds = dataRows
      .map(row => rowToObject(headers, row))
      .filter(n => n.id)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return nbds;
  } catch (error) {
    console.error('Error fetching NBD Incomings:', error);
    throw error;
  }
}

export async function createNBDIncoming(data: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.NBD_INCOMING;

    // Check headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    let headers = response.data.values?.[0] || [];

    if (headers.length === 0) {
      const defaultHeaders = [
        'id', 'party_name', 'type', 'contact_person', 'email', 'contact_no_1', 'contact_no_2',
        'location', 'state', 'stage', 'tat_days', 'field_person_name', 'remarks', 'created_at', 'updated_at'
      ];
      await sheets.spreadsheets.values.update({
        spreadsheetId: NBD_SPREADSHEET_ID,
        range: `${sheetName}!A1:O1`,
        valueInputOption: 'RAW',
        requestBody: { values: [defaultHeaders] },
      });
      headers = defaultHeaders;
    }

    // Generate ID
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const newId = (allData.data.values || []).length;

    const newNBD = {
      id: newId,
      ...data,
      created_at: formatToSheetDate(new Date()),
      updated_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, newNBD);

    await sheets.spreadsheets.values.append({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: { values: [rowData] },
    });

    return newNBD;
  } catch (error) {
    console.error('Error creating NBD Incoming:', error);
    throw error;
  }
}

export async function updateNBDIncoming(id: number, data: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.NBD_INCOMING;

    const headersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const headers = headersRes.data.values?.[0];
    if (!headers) throw new Error('Headers not found');

    const idRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const ids = idRes.data.values || [];
    const rowIndex = ids.findIndex(row => parseInt(row[0]) == id);

    if (rowIndex === -1) throw new Error('NBD Incoming not found');
    const actualRow = rowIndex + 1;

    // Fetch existing
    const rowRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRow}:Z${actualRow}`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const existing = rowToObject(headers, rowRes.data.values?.[0] || []);

    const updated = {
      ...existing,
      ...data,
      updated_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, updated);

    await sheets.spreadsheets.values.update({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRow}:Z${actualRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [rowData] },
    });

    return updated;
  } catch (error) {
    console.error('Error updating NBD Incoming:', error);
    throw error;
  }
}

export async function deleteNBDIncoming(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.NBD_INCOMING;

    const idRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const ids = idRes.data.values || [];
    const rowIndex = ids.findIndex(row => parseInt(row[0]) == id);

    if (rowIndex === -1) throw new Error('NBD Incoming not found');

    const actualRow = rowIndex + 1;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: NBD_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: await getSheetId(sheets, NBD_SPREADSHEET_ID, sheetName),
              dimension: 'ROWS',
              startIndex: actualRow - 1,
              endIndex: actualRow
            }
          }
        }]
      }
    });

    return { id };
  } catch (error) {
    console.error('Error deleting NBD Incoming:', error);
    throw error;
  }
}

// CRR CRUD OPERATIONS

export async function getCRRs() {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.CRR;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const crrs = dataRows
      .map(row => rowToObject(headers, row))
      .filter(n => n.id)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return crrs;
  } catch (error) {
    console.error('Error fetching CRRs:', error);
    throw error;
  }
}

export async function createCRR(data: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.CRR;

    // Check headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    let headers = response.data.values?.[0] || [];

    if (headers.length === 0) {
      const defaultHeaders = [
        'id', 'party_name', 'type', 'contact_person', 'email', 'contact_no_1', 'contact_no_2',
        'location', 'state', 'stage', 'tat_days', 'field_person_name', 'remarks', 'created_at', 'updated_at'
      ];
      await sheets.spreadsheets.values.update({
        spreadsheetId: NBD_SPREADSHEET_ID,
        range: `${sheetName}!A1:O1`,
        valueInputOption: 'RAW',
        requestBody: { values: [defaultHeaders] },
      });
      headers = defaultHeaders;
    }

    // Generate ID
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const newId = (allData.data.values || []).length;

    const newCRR = {
      id: newId,
      ...data,
      created_at: formatToSheetDate(new Date()),
      updated_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, newCRR);

    await sheets.spreadsheets.values.append({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: { values: [rowData] },
    });

    return newCRR;
  } catch (error) {
    console.error('Error creating CRR:', error);
    throw error;
  }
}

export async function updateCRR(id: number, data: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.CRR;

    const headersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const headers = headersRes.data.values?.[0];
    if (!headers) throw new Error('Headers not found');

    const idRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const ids = idRes.data.values || [];
    const rowIndex = ids.findIndex(row => parseInt(row[0]) == id);

    if (rowIndex === -1) throw new Error('CRR not found');
    const actualRow = rowIndex + 1;

    // Fetch existing
    const rowRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRow}:Z${actualRow}`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const existing = rowToObject(headers, rowRes.data.values?.[0] || []);

    const updated = {
      ...existing,
      ...data,
      updated_at: formatToSheetDate(new Date())
    };

    const rowData = objectToRow(headers, updated);

    await sheets.spreadsheets.values.update({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A${actualRow}:Z${actualRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [rowData] },
    });

    return updated;
  } catch (error) {
    console.error('Error updating CRR:', error);
    throw error;
  }
}

export async function deleteCRR(id: number) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = SHEETS.CRR;

    const idRes = await sheets.spreadsheets.values.get({
      spreadsheetId: NBD_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    const ids = idRes.data.values || [];
    const rowIndex = ids.findIndex(row => parseInt(row[0]) == id);

    if (rowIndex === -1) throw new Error('CRR not found');

    const actualRow = rowIndex + 1;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: NBD_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: await getSheetId(sheets, NBD_SPREADSHEET_ID, sheetName),
              dimension: 'ROWS',
              startIndex: actualRow - 1,
              endIndex: actualRow
            }
          }
        }]
      }
    });

    return { id };
  } catch (error) {
    console.error('Error deleting CRR:', error);
    throw error;
  }
}

// O2D CONFIGURATION OPERATIONS

const O2D_CONFIG_SHEET_NAME = 'Step Configuration';

export async function getO2DStepConfig() {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = O2D_CONFIG_SHEET_NAME;

    // Try to read to ensure sheet exists
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: O2D_SPREADSHEET_ID,
        range: `${sheetName}!A:E`,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return [];
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Map row to object using existing helper (implicitly available in scope)
      // Note: rowToObject is internal function in this file
      const config = dataRows.map(row => {
        // Simple mapping based on known columns to avoid snake_case/camelCase confusion
        // headers: step, step_name, doer_name, tat_value, tat_unit
        // row indices: 0, 1, 2, 3, 4
        return {
          step: parseInt(row[0]),
          stepName: row[1],
          doerName: row[2],
          tatValue: parseInt(row[3]),
          tatUnit: row[4]
        };
      }).sort((a, b) => a.step - b.step);

      return config;
    } catch (error: any) {
      if (error.code === 400 || error.message?.includes('Unable to parse range')) {
        return [];
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching O2D config step:', error);
    // Return empty if error to avoid crashing UI
    return [];
  }
}

export async function updateO2DStepConfig(config: any[]) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = O2D_CONFIG_SHEET_NAME;

    // Headers
    const headers = ['step', 'step_name', 'doer_name', 'tat_value', 'tat_unit'];

    // Check if sheet exists by trying to get A1
    try {
      await sheets.spreadsheets.values.get({
        spreadsheetId: O2D_SPREADSHEET_ID,
        range: `${sheetName}!A1`,
      });
    } catch (error: any) {
      if (error.code === 400 || error.message?.includes('Unable to parse range')) {
        // Create sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: O2D_SPREADSHEET_ID,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    frozenRowCount: 1
                  }
                }
              }
            }]
          }
        });
      } else {
        throw error;
      }
    }

    // Format rows
    const rows = config.map(c => [
      c.step,
      c.stepName,
      c.doerName,
      c.tatValue,
      c.tatUnit
    ]);

    // Update data
    await sheets.spreadsheets.values.update({
      spreadsheetId: O2D_SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers, ...rows]
      }
    });

    return true;
  } catch (error) {
    console.error('Error updating O2D config:', error);
    throw error;
  }
}

