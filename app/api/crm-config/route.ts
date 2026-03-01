import { NextResponse } from 'next/server';
import { getCRMStepConfig, updateCRMStepConfig } from '@/lib/sheets';

export async function GET() {
    try {
        const config = await getCRMStepConfig();
        return NextResponse.json({ config });
    } catch (error) {
        console.error('Error in CRM config GET:', error);
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { config } = await request.json();
        if (!config || !Array.isArray(config)) {
            return NextResponse.json({ error: 'Invalid config' }, { status: 400 });
        }
        await updateCRMStepConfig(config);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in CRM config PUT:', error);
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}
