
import { NextResponse } from 'next/server';
import { getIMSFGData } from '@/lib/sheets';

export async function GET() {
    try {
        const data = await getIMSFGData();
        return NextResponse.json(data);
    } catch (error) {
        console.error('API Error in ims-fg:', error);
        return NextResponse.json({ error: 'Failed to fetch IMS FG data' }, { status: 500 });
    }
}
