import { NextRequest, NextResponse } from 'next/server';
import { getFactoryRequirementConfig, updateFactoryRequirementConfig } from '@/lib/sheets';

export async function GET() {
    try {
        const config = await getFactoryRequirementConfig();
        return NextResponse.json({ config });
    } catch (error) {
        console.error('Error fetching Factory Requirement config:', error);
        return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { config } = await request.json();

        if (!config || !Array.isArray(config)) {
            return NextResponse.json({ error: 'Invalid configuration data' }, { status: 400 });
        }

        await updateFactoryRequirementConfig(config);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating Factory Requirement config:', error);
        return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
    }
}
