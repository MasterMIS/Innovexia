import { NextResponse } from 'next/server';
import {
    getFactoryRequirements,
    createFactoryRequirement,
    updateFactoryRequirement,
    deleteFactoryRequirement
} from '@/lib/sheets';

export async function GET() {
    try {
        const requirements = await getFactoryRequirements();
        return NextResponse.json(requirements);
    } catch (error) {
        console.error('Error fetching Factory Requirements:', error);
        return NextResponse.json({ error: 'Failed to fetch requirements' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();

        if (!data.requirement_type || !data.requirement) {
            return NextResponse.json(
                { error: 'Requirement Type and Requirement are required' },
                { status: 400 }
            );
        }

        const newRequirement = await createFactoryRequirement(data);
        return NextResponse.json(newRequirement);
    } catch (error) {
        console.error('Error creating Factory Requirement:', error);
        return NextResponse.json({ error: 'Failed to create requirement' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const data = await request.json();
        const { id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const updated = await updateFactoryRequirement(parseInt(id), updateData);
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating Factory Requirement:', error);
        return NextResponse.json({ error: 'Failed to update requirement' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await deleteFactoryRequirement(parseInt(id));
        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Error deleting Factory Requirement:', error);
        return NextResponse.json({ error: 'Failed to delete requirement' }, { status: 500 });
    }
}
