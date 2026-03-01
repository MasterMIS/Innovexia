import { NextResponse } from 'next/server';
import { getCRMData, updateCRMData } from '@/lib/sheets';

export async function GET() {
    try {
        const data = await getCRMData();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const result = await updateCRMData(id, updates);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in CRM PUT:', error);
        return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
    }
}
