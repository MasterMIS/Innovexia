import { NextResponse } from 'next/server';
import { getGoogleSheetsClient, getO2DDropdowns, SPREADSHEET_IDS } from '@/lib/sheets';

const SPREADSHEET_ID = SPREADSHEET_IDS.CLIENT_COMPLAIN;
const DROPDOWN_SHEET = 'Dropdown';

export async function GET() {
    try {
        const [clientNames, sheets] = await Promise.all([
            getO2DDropdowns(),
            getGoogleSheetsClient()
        ]);

        // Fetch B2:B from Dropdown sheet of CLIENT_COMPLAIN spreadsheet — B = Product Names
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${DROPDOWN_SHEET}!B2:B`,
        });

        const rows = response.data.values || [];
        const productNames: string[] = rows
            .map((row) => (row[0] || '').toString().trim())
            .filter(Boolean);

        return NextResponse.json({ clientNames, productNames });
    } catch (error: any) {
        console.error('Error fetching dropdown data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dropdown data', details: error.message },
            { status: 500 }
        );
    }
}
