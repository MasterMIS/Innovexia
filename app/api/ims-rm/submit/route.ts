
import { NextResponse } from 'next/server';
import { submitIMSPartyDetails } from '@/lib/sheets';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const result = await submitIMSPartyDetails(body);
        return NextResponse.json(result);
    } catch (error) {
        console.error('API Error in ims-rm/submit:', error);
        return NextResponse.json({ error: 'Failed to submit party details' }, { status: 500 });
    }
}
