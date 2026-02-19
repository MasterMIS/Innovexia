import { NextResponse } from 'next/server';
import { confirmIMSRMOrder } from '@/lib/sheets';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const result = await confirmIMSRMOrder(body);
        return NextResponse.json(result);
    } catch (error) {
        console.error('API Error in ims-rm/confirm:', error);
        return NextResponse.json({ error: 'Failed to confirm order' }, { status: 500 });
    }
}
