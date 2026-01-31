import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { SPREADSHEET_IDS } from '@/lib/sheets';
import { getGoogleSheetsClient } from '@/lib/oauth';

const SPREADSHEET_ID = SPREADSHEET_IDS.MOM;
const SHEET_NAME = 'mom';

// Helper to get Google Sheets API
async function getSheetsAPI() {
  return await getGoogleSheetsClient();
}

// Initialize sheet with headers if empty
async function initializeSheet(sheets: any) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:Z1`,
    });

    if (!response.data.values || response.data.values.length === 0) {
      const headers = [
        'MOM No',
        'Project Name',
        'Date',
        'Time',
        'Location',
        'RA Team',
        'Client Team',
        'Vendor Team',
        'Other',
        'Meeting Minutes',
        'Info Points',
        'Pending Actions',
        'Created At',
        'Updated At'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:N1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      });
    }
  } catch (error) {
    console.error('Error initializing sheet:', error);
  }
}

// Generate MOM Number
function generateMOMNumber(): string {
  const timestamp = Date.now();
  return `MOM-${timestamp}`;
}

// GET - Fetch all MOMs
export async function GET(request: NextRequest) {
  try {
    const sheets = await getSheetsAPI();
    await initializeSheet(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:N`,
    });

    const rows = response.data.values || [];
    const moms = rows.map((row, index) => ({
      id: index + 2,
      momNo: row[0] || '',
      projectName: row[1] || '',
      date: row[2] || '',
      time: row[3] || '',
      location: row[4] || '',
      raTeam: row[5] ? JSON.parse(row[5]) : [],
      clientTeam: row[6] ? JSON.parse(row[6]) : [],
      vendorTeam: row[7] ? JSON.parse(row[7]) : [],
      other: row[8] ? JSON.parse(row[8]) : [],
      meetingMinutes: row[9] ? JSON.parse(row[9]) : [],
      infoPoints: parseInt(row[10]) || 0,
      pendingActions: parseInt(row[11]) || 0,
      createdAt: row[12] || '',
      updatedAt: row[13] || '',
    }));

    return NextResponse.json({ success: true, data: moms });
  } catch (error: any) {
    console.error('Error fetching MOMs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new MOM
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectName,
      date,
      time,
      location,
      raTeam,
      clientTeam,
      vendorTeam,
      other,
      meetingMinutes
    } = body;

    const sheets = await getSheetsAPI();
    await initializeSheet(sheets);

    const momNo = generateMOMNumber();
    const now = new Date().toISOString();

    // Calculate info points and pending actions
    const infoPoints = meetingMinutes.length;
    const pendingActions = meetingMinutes.filter((m: any) => !m.actualCompletion).length;

    const newRow = [
      momNo,
      projectName,
      date,
      time,
      location || '',
      JSON.stringify(raTeam || []),
      JSON.stringify(clientTeam || []),
      JSON.stringify(vendorTeam || []),
      JSON.stringify(other || []),
      JSON.stringify(meetingMinutes || []),
      infoPoints,
      pendingActions,
      now,
      now
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:N`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        momNo,
        projectName,
        date,
        time,
        location,
        raTeam,
        clientTeam,
        vendorTeam,
        other,
        meetingMinutes,
        infoPoints,
        pendingActions,
        createdAt: now,
        updatedAt: now
      }
    });
  } catch (error: any) {
    console.error('Error creating MOM:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update existing MOM
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      projectName,
      date,
      time,
      location,
      raTeam,
      clientTeam,
      vendorTeam,
      other,
      meetingMinutes
    } = body;

    const sheets = await getSheetsAPI();
    const now = new Date().toISOString();

    // Calculate info points and pending actions
    const infoPoints = meetingMinutes.length;
    const pendingActions = meetingMinutes.filter((m: any) => !m.actualCompletion).length;

    // Get the MOM number from the existing row
    const existingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}`,
    });

    const momNo = existingResponse.data.values?.[0]?.[0] || '';
    const createdAt = existingResponse.data.values?.[0]?.[12] || now;

    const updatedRow = [
      momNo,
      projectName,
      date,
      time,
      location || '',
      JSON.stringify(raTeam || []),
      JSON.stringify(clientTeam || []),
      JSON.stringify(vendorTeam || []),
      JSON.stringify(other || []),
      JSON.stringify(meetingMinutes || []),
      infoPoints,
      pendingActions,
      createdAt,
      now
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${id}:N${id}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        momNo,
        projectName,
        date,
        time,
        location,
        raTeam,
        clientTeam,
        vendorTeam,
        other,
        meetingMinutes,
        infoPoints,
        pendingActions,
        createdAt,
        updatedAt: now
      }
    });
  } catch (error: any) {
    console.error('Error updating MOM:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
