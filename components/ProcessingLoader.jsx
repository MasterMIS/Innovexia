import { google } from 'googleapis';
import { getGoogleSheetsClient as getOAuthSheetsClient } from './oauth';

// Spreadsheet IDs for different features
const SPREADSHEET_IDS = {
  DELEGATION: '1m0H-RXY1lwvY1DKur7-JwUI-FfxLZv7KWPI7HJWlYhM',
  USERS: '1lYFGRBv0FgN2tQuakbpI5GYY8h8M8jUptGW-z8l9g_4',
  TODOS: '1wqMwWLFyEDUUvTI3CrVyFXemLnTYcTf7JVxcZhCLHO0',
  HELPDESK: '17AWbMisFx_cjC2exMpf86d21VKp1dl-q49FWIcWaSkk',
  CHECKLISTS: '1PbXHXWj3jRsA6EvEHZMyzFe7Q0BsUrvCEX5PslAbhSg',
  CHAT: '1BUiGYRmlT-fcQ7Qw9VIJkyPRyzdiuSeleJY785QncHM',
  NOTIFICATIONS: '1EqJyQR_UaXMjh6Cua1TIkMRyQqxcvJoJanvT2SB_Dco',
  MOM: '1A7kINXsl513H_NszKbhAosSqmFI-zeYSsEGob94SKPc',
  LEAD_TO_SALES: '1WWAxBcv8czVrThlsEXdxjEYZ674lhfxdiHgMX5KHQAc',
  DEPARTMENTS: '1Om5QWo4iLEGeQkKF5jyEY6YeRUFil8GFkDXdkAifF3I',
};

// Backward compatibility
const DELEGATION_SPREADSHEET_ID = SPREADSHEET_IDS.DELEGATION;
const USERS_SPREADSHEET_ID = SPREADSHEET_IDS.USERS;
const NOTIFICATIONS_SPREADSHEET_ID = SPREADSHEET_IDS.NOTIFICATIONS;

// Format date as dd/mm/yyyy HH:mm:ss
function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Sheet names
const SHEETS = {
  DELEGATION: 'delegation',
  DELEGATION_REMARKS: 'delegation_remarks',
  DELEGATION_HISTORY: 'delegation_revision_history',
  USERS: 'users'
};

// Initialize Google Sheets API client with OAuth
export async function getGoogleSheetsClient() {
  return await getOAuthSheetsClient();
}

// Helper function to convert array to object based on header row
function rowToObject(headers: string[], row: any[]): any {
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
    
    // Handle boolean fields from Google Sheets (stored as TRUE/FALSE strings)
    if ((header === 'evidence_required' || header === 'verification_required' || header === 'attachment_required') && typeof value === 'string') {
      obj[header] = value.toUpperCase() === 'TRUE';
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
    if (role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'tl') {
      // Admin or TL - show all delegations
      // No filtering needed
    } else {
      // Regular user - show only delegations where user is the doer
      delegations = delegations.filter(delegation => 
        delegation.doer_name && username && 
        delegation.doer_name.toLowerCase() === username.toLowerCase()
      );
    }
    
    // Sort by created_at descending
    delegations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
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
      created_at: formatDateTime(new Date()),
      updated_at: formatDateTime(new Date())
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
    const rowIndex = dataRows.findIndex(row => {
      const rowId = parseInt(row[0]);
      const searchId = typeof id === 'string' ? parseInt(id) : id;
      return rowId === searchId;
    });
    if (rowIndex === -1) {
      throw new Error('Delegation not found');
    }

    // Update the delegation object
    const existingDelegation = rowToObject(headers, dataRows[rowIndex]);
    const updatedDelegation = {
      ...existingDelegation,
      ...delegationData,
      updated_at: formatDateTime(new Date())
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
      created_at: formatDateTime(new Date())
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
      created_at: formatDateTime(new Date())
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
      range: `${sheetName}!A:AZ`,
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
      created_at: formatDateTime(new Date())
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

// Role-based notification system - Admin sees all, TL and Doer see their specific notifications
export async function getNotifications(userId: number, userRole: string, unreadOnly: boolean = false) {
  try {
    const sheets = await getGoogleSheetsClient();

    // Ensure sheet exists with headers
    try {
      const headerCheck = await sheets.spreadsheets.values.get({
        spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
        range: `${NOTIFICATIONS_SHEET}!A1:I1`,
      });
      
      // If no headers, add them
      if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
          range: `${NOTIFICATIONS_SHEET}!A1:I1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [['id', 'user_id', 'user_role', 'type', 'title', 'message', '', 'is_read', 'created_at']],
          },
        });
      }
    } catch (error) {
      console.error('❌ Error checking/creating headers:', error);
      throw error;
    }

    // Read all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      range: `${NOTIFICATIONS_SHEET}!A:I`,
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
    });

    const rows = response.data.values || [];
    const lastId = rows.length > 1 ? Math.max(...rows.slice(1).map(row => parseInt(row[0]) || 0)) : 0;
    const newId = lastId + 1;

    const now = formatDateTime(new Date());

    const newRow = [
      newId,
      notificationData.user_id || '',
      notificationData.user_role || '',
      notificationData.type,
      notificationData.title,
      notificationData.message,
      notificationData.reference_id || notificationData.delegation_id || '',
      'FALSE',
      now,
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      range: `${NOTIFICATIONS_SHEET}!A:I`,
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
let checklistSheetEnsured = false;

// Helper function to ensure checklist sheet exists with proper headers
async function ensureChecklistSheetExists(sheets: any, spreadsheetId: string, sheetName: string) {
  try {
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
        range: `${sheetName}!A1:P1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [defaultHeaders],
        },
      });
    } else {
      // Update headers if they don't match expected format
      const headersMatch = JSON.stringify(existingHeaders.slice(0, 16)) === JSON.stringify(defaultHeaders);
      if (!headersMatch) {
        console.log('Updating checklist sheet headers to match expected format...');
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1:P1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [defaultHeaders],
          },
        });
      }
    }
  } catch (error) {
    console.error('Error ensuring checklist sheet exists:', error);
    throw error;
  }
}

export async function getChecklists() {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklists'; // Checklist sheet name

    // Ensure sheet exists
    await ensureChecklistSheetExists(sheets, SPREADSHEET_IDS.CHECKLISTS, sheetName);

    // Read all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
    });

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
      .filter(checklist => checklist.id); // Filter out empty rows
    
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

    // Ensure sheet exists with headers (only once per session)
    if (!checklistSheetEnsured) {
      await ensureChecklistSheetExists(sheets, SPREADSHEET_IDS.CHECKLISTS, sheetName);
      checklistSheetEnsured = true;
    }

    // Read headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A1:P1`,
    });

    const headers = response.data.values?.[0] || [];

    // Get all existing IDs to find the maximum
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:A`,
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
    const now = formatDateTime(new Date());
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
      valueInputOption: 'RAW',
      requestBody: {
        values: rowsData,
      },
    });
    
    return rowsData.length;
  } catch (error) {
    console.error('Error creating checklists batch in Google Sheets:', error);
    throw error;
  }
}

export async function createChecklist(checklistData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetName = 'checklists'; // Checklist sheet name

    // Ensure sheet exists with headers (only once per session)
    if (!checklistSheetEnsured) {
      await ensureChecklistSheetExists(sheets, SPREADSHEET_IDS.CHECKLISTS, sheetName);
      checklistSheetEnsured = true;
    }

    // Read headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A1:P1`,
    });

    const headers = response.data.values?.[0] || [];

    // Get all existing IDs to find the maximum
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:A`,
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
      created_at: formatDateTime(new Date()),
      updated_at: formatDateTime(new Date())
    };

    // Convert to row array
    const rowData = objectToRow(headers, checklist);

    // Append row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
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
      updated_at: formatDateTime(new Date())
    };

    // Convert to row array
    const rowData = objectToRow(headers, updatedChecklist);

    // Update the specific row (add 2 to rowIndex: 1 for header, 1 for 0-based index)
    const actualRowNumber = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_IDS.CHECKLISTS,
      range: `${sheetName}!A${actualRowNumber}:Z${actualRowNumber}`,
      valueInputOption: 'RAW',
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
          updated_at: formatDateTime(new Date())
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
        valueInputOption: 'RAW',
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

// Export spreadsheet IDs for use in other features
export { SPREADSHEET_IDS };

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
      created_at: formatDateTime(new Date())
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