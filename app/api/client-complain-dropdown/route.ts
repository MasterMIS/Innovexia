import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/sheets';

const SPREADSHEET_ID = '1NbmOkuvfCDIdeK-UGKzWvPtWMf1Io1Yo9TH-lz-_uNs';
const DROPDOWN_SHEET = 'Dropdown';

export async function GET() {
    try {
        const sheets = await getGoogleSheetsClient();

        // Fetch A2:B from Dropdown sheet — A = Client Names, B = Product Names
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${DROPDOWN_SHEET}!A2:B`,
        });

        const rows = response.data.values || [];

        const clientNames: string[] = [];
        const productNames: string[] = [];

        rows.forEach((row) => {
            const clientName = (row[0] || '').toString().trim();
            const productName = (row[1] || '').toString().trim();
            if (clientName) clientNames.push(clientName);
            if (productName) productNames.push(productName);
        });

        return NextResponse.json({ clientNames, productNames });
    } catch (error: any) {
        console.error('Error fetching dropdown data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dropdown data', details: error.message },
            { status: 500 }
        );
    }
}
