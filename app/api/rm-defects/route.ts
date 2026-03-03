import { NextResponse } from 'next/server';
import {
    getRMDefectsData,
    createRMDefectsData,
    updateRMDefectsData,
    deleteRMDefectsData
} from '@/lib/sheets';

export async function GET() {
    try {
        const data = await getRMDefectsData();
        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('Error fetching RM defects data:', error);
        return NextResponse.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const defects = Array.isArray(body) ? body : [body];

        if (defects.length === 0) {
            return NextResponse.json({ error: 'At least one record is required' }, { status: 400 });
        }

        const validDefects = defects.filter(d => d.materialName?.trim());
        if (validDefects.length === 0) {
            return NextResponse.json({ error: 'Material Name is required for all records' }, { status: 400 });
        }

        const result = await createRMDefectsData(validDefects);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error adding RM defects:', error);
        return NextResponse.json({ error: 'Failed to add records', details: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const result = await updateRMDefectsData(id, body);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error updating RM defect:', error);
        return NextResponse.json({ error: 'Failed to update record', details: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

        const result = await deleteRMDefectsData(id);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error deleting RM defect:', error);
        return NextResponse.json({ error: 'Failed to delete record', details: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { id, cancelled } = await request.json();
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

        const result = await updateRMDefectsData(id, { Cancelled: cancelled ? 'Yes' : '' });
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error cancelling RM defect:', error);
        return NextResponse.json({ error: 'Failed to cancel record', details: error.message }, { status: 500 });
    }
}
