import { NextResponse } from 'next/server';
import { getCostingItems } from '@/lib/sheets';

export async function GET() {
    try {
        const items = await getCostingItems();
        return NextResponse.json({ items });
    } catch (error) {
        console.error('Error fetching costing items:', error);
        return NextResponse.json({ error: 'Failed to fetch costing items' }, { status: 500 });
    }
}
