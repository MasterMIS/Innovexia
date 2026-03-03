import { NextResponse } from 'next/server';
import {
    getClientComplainData,
    createClientComplainData,
    updateClientComplainData,
    deleteClientComplainData
} from '@/lib/sheets';

// SPREADSHEET_ID and SHEET_NAME are now encapsulated in lib/sheets.ts

export async function GET() {
    try {
        const data = await getClientComplainData();
        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('Error fetching client complain data:', error);
        return NextResponse.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Support both single object and array of objects
        const complaints = Array.isArray(body) ? body : [body];

        if (complaints.length === 0) {
            return NextResponse.json({ error: 'At least one complaint is required' }, { status: 400 });
        }

        const validComplaints = complaints.filter(c => c.clientName?.trim());
        if (validComplaints.length === 0) {
            return NextResponse.json({ error: 'Client Name is required for all complaints' }, { status: 400 });
        }

        const result = await createClientComplainData(validComplaints);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error adding complaints:', error);
        return NextResponse.json({ error: 'Failed to add complaints', details: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const result = await updateClientComplainData(id, body);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error updating complaint:', error);
        return NextResponse.json({ error: 'Failed to update complaint', details: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

        const result = await deleteClientComplainData(id);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error deleting complaint:', error);
        return NextResponse.json({ error: 'Failed to delete complaint', details: error.message }, { status: 500 });
    }
}

// Bulk update is handled via individual PUT requests from the frontend for now,
// but we could implement a dedicated PATCH here if needed.
export async function PATCH(request: Request) {
    try {
        const { id, cancelled } = await request.json();
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

        const result = await updateClientComplainData(id, { Cancelled: cancelled ? 'Yes' : '' });
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error cancelling complaint:', error);
        return NextResponse.json({ error: 'Failed to cancel complaint', details: error.message }, { status: 500 });
    }
}
