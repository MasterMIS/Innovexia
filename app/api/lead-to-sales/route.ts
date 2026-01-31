import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { SPREADSHEET_IDS } from '@/lib/sheets';
import { getGoogleSheetsClient } from '@/lib/oauth';

const SPREADSHEET_ID = SPREADSHEET_IDS.LEAD_TO_SALES;
const SHEET_NAME = 'lead_to_sales';

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
        'ID',
        'Source of Lead',
        'Company Name',
        'Contact Person',
        'Contact No',
        'Address',
        'Requirements',
        'Divisions',
        'Lead Assigned To',
        'Client Type',
        'Order Type',
        'Select OEM',
        'Customer Type',
        'Product Type',
        'Qualifying Meet Date',
        'Remarks',
        'Created At',
        'Updated At'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:R1`,
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

// Generate ID
function generateLeadID(): string {
  const timestamp = Date.now();
  return `LEAD-${timestamp}`;
}

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

// GET - Fetch all leads
export async function GET(request: NextRequest) {
  try {
    const sheets = await getSheetsAPI();
    await initializeSheet(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:R`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const leads = rows.map((row) => ({
      id: row[0] || '',
      sourceOfLead: row[1] || '',
      companyName: row[2] || '',
      contactPerson: row[3] || '',
      contactNo: row[4] || '',
      address: row[5] || '',
      requirements: row[6] || '',
      divisions: row[7] || '',
      leadAssignedTo: row[8] || '',
      clientType: row[9] || '',
      orderType: row[10] || '',
      selectOEM: row[11] || '',
      customerType: row[12] || '',
      productType: row[13] || '',
      qualifyingMeetDate: row[14] || '',
      remarks: row[15] || '',
      createdAt: row[16] || '',
      updatedAt: row[17] || '',
    }));

    return NextResponse.json({ success: true, data: leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// POST - Create new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sheets = await getSheetsAPI();
    await initializeSheet(sheets);

    const leadID = generateLeadID();
    const now = formatDateTime(new Date());

    const newRow = [
      leadID,
      body.sourceOfLead || '',
      body.companyName || '',
      body.contactPerson || '',
      body.contactNo || '',
      body.address || '',
      body.requirements || '',
      body.divisions || '',
      body.leadAssignedTo || '',
      body.clientType || '',
      body.orderType || '',
      body.selectOEM || '',
      body.customerType || '',
      body.productType || '',
      body.qualifyingMeetDate || '',
      body.remarks || '',
      now,
      now
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:R`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: leadID,
        ...body,
        createdAt: now,
        updatedAt: now
      }
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ success: false, error: 'Failed to create lead' }, { status: 500 });
  }
}

// PUT - Update lead
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 });
    }

    const sheets = await getSheetsAPI();

    // Find the row with this ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = response.data.values;
    if (!rows) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rowIndex = i + 1; // +1 because sheets are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const now = formatDateTime(new Date());

    const updatedRow = [
      id,
      updateData.sourceOfLead || '',
      updateData.companyName || '',
      updateData.contactPerson || '',
      updateData.contactNo || '',
      updateData.address || '',
      updateData.requirements || '',
      updateData.divisions || '',
      updateData.leadAssignedTo || '',
      updateData.clientType || '',
      updateData.orderType || '',
      updateData.selectOEM || '',
      updateData.customerType || '',
      updateData.productType || '',
      updateData.qualifyingMeetDate || '',
      updateData.remarks || '',
      rows[rowIndex - 1][16], // Keep original created date
      now
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex}:R${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id,
        ...updateData,
        updatedAt: now
      }
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ success: false, error: 'Failed to update lead' }, { status: 500 });
  }
}
