import { NextResponse } from 'next/server';
import { getO2DDropdowns, addO2DDropdown } from '@/lib/sheets';

export async function GET() {
    try {
        const parties = await getO2DDropdowns();
        return NextResponse.json({ parties });
    } catch (error: any) {
        console.error('Error fetching O2D dropdown data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dropdown data', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const { name } = await request.json();
        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }
        const result = await addO2DDropdown(name);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error adding O2D dropdown data:', error);
        return NextResponse.json(
            { error: 'Failed to add dropdown data', details: error.message },
            { status: 500 }
        );
    }
}
