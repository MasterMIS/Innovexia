import { NextResponse } from 'next/server';
import {
    getJobWorkData,
    createJobWorkData,
    updateJobWorkData,
    deleteJobWorkData
} from '@/lib/sheets';

export async function GET() {
    try {
        const data = await getJobWorkData();
        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('Error fetching Job Work data:', error);
        return NextResponse.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const items = Array.isArray(body) ? body : [body];

        if (items.length === 0) {
            return NextResponse.json({ error: 'At least one record is required' }, { status: 400 });
        }

        const validItems = items.filter(d => d.jobWorkName?.trim());
        if (validItems.length === 0) {
            return NextResponse.json({ error: 'Job Work Name is required for all records' }, { status: 400 });
        }

        const result = await createJobWorkData(validItems);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error adding Job Work records:', error);
        return NextResponse.json({ error: 'Failed to add records', details: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, updates } = body;

        // If updates is provided as a separate object, use it; otherwise use body minus id
        const finalUpdates = updates || { ...body };
        delete finalUpdates.id;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const result = await updateJobWorkData(id, finalUpdates);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error updating Job Work record:', error);
        return NextResponse.json({ error: 'Failed to update record', details: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

        const result = await deleteJobWorkData(id);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error deleting Job Work record:', error);
        return NextResponse.json({ error: 'Failed to delete record', details: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { id, cancelled, ...rest } = await request.json();
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

        const updates: any = { ...rest };
        if (cancelled !== undefined) {
            updates.Cancelled = cancelled ? 'Yes' : '';
        }

        const result = await updateJobWorkData(id, updates);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error updating Job Work record status:', error);
        return NextResponse.json({ error: 'Failed to update status', details: error.message }, { status: 500 });
    }
}
