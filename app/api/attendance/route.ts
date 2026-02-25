import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient, SPREADSHEET_IDS, getUserById } from '@/lib/sheets';
import { normalizeDate, parseSheetDate, getIstDateString } from '@/lib/dateUtils';
import { calculateDistance, parseLatLong } from '@/lib/locationUtils';

// Helper to get full timestamp in IST
const getIstTimestamp = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value;
    return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
};

const SHEET_NAME = 'Sheet1';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const sheets = await getGoogleSheetsClient();
        const spreadsheetId = SPREADSHEET_IDS.ATTENDANCE;

        // Read all rows
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${SHEET_NAME}!A:G`,
        });

        const rows = response.data.values || [];
        const dataRows = rows.slice(1);

        // Filter for this user - ensure robust comparison
        const userRecords = dataRows.filter((row: any[]) => String(row[1]).trim() === String(userId).trim());

        const history = userRecords.map((row: any[]) => {
            const inTimeParsed = parseSheetDate(row[4]);
            const outTimeParsed = parseSheetDate(row[5]);
            return {
                date: normalizeDate(row[3]), // Normalized YYYY-MM-DD
                inTime: inTimeParsed,
                outTime: outTimeParsed,
                status: row[6]
            };
        });

        // Determine current status using IST date
        const todayStr = getIstDateString();
        const todayRecord = history.find((h: any) => h.date === todayStr);

        let currentStatus = 'IDLE';
        let lastCheckIn = null;

        if (todayRecord) {
            if (todayRecord.inTime && !todayRecord.outTime) {
                currentStatus = 'CHECKED_IN';
                lastCheckIn = todayRecord.inTime;
            } else if (todayRecord.inTime && todayRecord.outTime) {
                currentStatus = 'COMPLETED';
            }
        }

        return NextResponse.json({
            history,
            currentStatus,
            lastCheckIn
        });

    } catch (error) {
        console.error('Error fetching attendance:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, userId, userName, latitude, longitude } = body;

        if (!['CHECK_IN', 'CHECK_OUT'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Geofencing Validation
        const user = await getUserById(userId);
        if (user && user.late_long) {
            const registeredLoc = parseLatLong(user.late_long);
            if (registeredLoc) {
                if (latitude === null || longitude === null) {
                    return NextResponse.json({
                        error: 'Location access is required for attendance. Please enable location permissions.'
                    }, { status: 403 });
                }

                const distance = calculateDistance(
                    latitude,
                    longitude,
                    registeredLoc.lat,
                    registeredLoc.long
                );

                if (distance > 10) {
                    return NextResponse.json({
                        error: `You are not in range (${Math.round(distance)}m). Please go to your registered location.`
                    }, { status: 403 });
                }
            }
        }

        const sheets = await getGoogleSheetsClient();
        const spreadsheetId = SPREADSHEET_IDS.ATTENDANCE;

        // Get existing rows to find if we need to update or append
        const getResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${SHEET_NAME}!A:G`,
        });

        const rows = getResponse.data.values || [];
        const todayStr = getIstDateString();

        // Convert search parameters to string and trim for reliable comparison
        const searchUserId = String(userId).trim();

        // Find today's row index for this user
        let userRowIndex = -1;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rowUserId = String(row[1]).trim();
            const rowDateRaw = row[3];
            const rowNormalized = normalizeDate(rowDateRaw);

            if (rowUserId === searchUserId && rowNormalized === todayStr) {
                userRowIndex = i;
                break;
            }
        }

        const timestamp = getIstTimestamp();

        if (action === 'CHECK_IN') {
            if (userRowIndex !== -1) {
                return NextResponse.json({ error: 'Already checked in for today' }, { status: 400 });
            }

            const id = `${searchUserId}_${todayStr}`;
            const newRow = [
                id,
                searchUserId,
                userName,
                todayStr, // Date
                timestamp, // In Time
                '', // Out Time
                'IN' // Status
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${SHEET_NAME}!A:G`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [newRow]
                }
            });

            return NextResponse.json({ success: true, message: 'Checked in successfully', timestamp });

        } else if (action === 'CHECK_OUT') {
            if (userRowIndex === -1) {
                // If not found for "today" IST, maybe they checked in yesterday (night shift)
                // However, the current logic is daily based. Let's stick to daily for now but log failure.
                console.warn(`[Attendance] Check-out failed: No row found for user ${searchUserId} on ${todayStr}`);
                return NextResponse.json({ error: 'No check-in record found for today' }, { status: 400 });
            }

            // Update the row (Column F is Out Time, G is Status)
            const rowNumber = userRowIndex + 1;

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${SHEET_NAME}!F${rowNumber}:G${rowNumber}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[timestamp, 'COMPLETED']]
                }
            });

            return NextResponse.json({ success: true, message: 'Checked out successfully', timestamp });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Error processing attendance:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
