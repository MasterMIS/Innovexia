import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient, SPREADSHEET_IDS, getAllUsers } from '@/lib/sheets';
import { normalizeDate, parseSheetDate } from '@/lib/dateUtils';

const ATTENDANCE_SHEET_NAME = 'Sheet1';
const LEAVE_SHEET_NAME = 'Leave';

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
            // Ensure userId is string for consistent frontend comparison
            userId: row[1] ? String(row[1]).trim() : null,
            date: normalizeDate(row[3]),
            inTime: parseSheetDate(row[4]),
            outTime: parseSheetDate(row[5]),
            status: row[6]
        })).filter(a => a.userId); // Filter out rows without userId

        const leaveRows = leavesResponse.data.values || [];
        const leaveData = leaveRows.slice(1).map(row => ({
            userId: row[1] ? String(row[1]).trim() : null,
            startDate: normalizeDate(row[3]),
            endDate: normalizeDate(row[4]),
            reason: row[5],
            status: row[6]
        })).filter(l => l.userId);

        return NextResponse.json({
            users: users.map(u => ({
                // Ensure user id is string for consistent identification
                id: u.id ? String(u.id).trim() : null,
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
