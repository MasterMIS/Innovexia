import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient, SPREADSHEET_IDS, getAllUsers } from '@/lib/sheets';

const ATTENDANCE_SHEET_NAME = 'Sheet1';
const LEAVE_SHEET_NAME = 'Leave';

const normalizeDate = (dateStr: string) => {
    if (!dateStr) return '';
    const cleanStr = dateStr.trim();
    if (cleanStr.includes(' ')) {
        const parts = cleanStr.split(' ')[0].split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    if (cleanStr.includes('/')) {
        const parts = cleanStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    return cleanStr;
};

const parseSheetDate = (dateStr: string) => {
    if (!dateStr) return null;
    try {
        if (dateStr.includes('T')) return new Date(dateStr).toISOString();
        const [datePart, timePart] = dateStr.split(' ');
        if (!datePart) return null;
        const [d, m, y] = datePart.split('/').map(Number);
        let h = 0, min = 0, s = 0;
        if (timePart) {
            const parts = timePart.split(':').map(Number);
            h = parts[0] || 0;
            min = parts[1] || 0;
            s = parts[2] || 0;
        }

        // Construct an ISO-like string with IST offset (+05:30)
        // This ensures the server (likely UTC) parses it as IST
        const isoStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}+05:30`;
        const dateObj = new Date(isoStr);
        return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
    } catch (e) {
        return null;
    }
};

export async function GET(request: NextRequest) {
    try {
        const sheets = await getGoogleSheetsClient();
        const spreadsheetId = SPREADSHEET_IDS.ATTENDANCE;

        // Fetch everything in parallel
        const [users, attendanceResponse, leavesResponse] = await Promise.all([
            getAllUsers(),
            sheets.spreadsheets.values.get({ spreadsheetId, range: `${ATTENDANCE_SHEET_NAME}!A:G` }),
            sheets.spreadsheets.values.get({ spreadsheetId, range: `${LEAVE_SHEET_NAME}!A:G` })
        ]);

        const attendanceRows = attendanceResponse.data.values || [];
        const attendanceData = attendanceRows.slice(1).map(row => ({
            userId: row[1],
            date: normalizeDate(row[3]),
            inTime: parseSheetDate(row[4]),
            outTime: parseSheetDate(row[5]),
            status: row[6]
        }));

        const leaveRows = leavesResponse.data.values || [];
        const leaveData = leaveRows.slice(1).map(row => ({
            userId: row[1],
            startDate: normalizeDate(row[3]),
            endDate: normalizeDate(row[4]),
            reason: row[5],
            status: row[6]
        }));

        return NextResponse.json({
            users: users.map(u => ({
                id: u.id,
                username: u.username,
                full_name: u.full_name,
                image_url: u.image_url
            })),
            attendance: attendanceData,
            leaves: leaveData
        });

    } catch (error) {
        console.error('Error in Attendance Master API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
