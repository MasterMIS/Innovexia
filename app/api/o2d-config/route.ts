import { NextRequest, NextResponse } from 'next/server';
import { getO2DStepConfig, updateO2DStepConfig } from '@/lib/sheets';

export async function GET() {
    try {
        const config = await getO2DStepConfig();
        return NextResponse.json({ config });
    } catch (error) {
        console.error('Error fetching O2D config:', error);
        return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { config } = await request.json();

        if (!config || !Array.isArray(config)) {
            return NextResponse.json({ error: 'Invalid configuration data' }, { status: 400 });
        }

        // Validate configuration
        for (const stepConfig of config) {
            if (!stepConfig.step || !stepConfig.stepName || !stepConfig.doerName || !stepConfig.tatValue || !stepConfig.tatUnit) {
                return NextResponse.json({ error: 'Missing required fields in configuration' }, { status: 400 });
            }

            if (stepConfig.tatValue <= 0) {
                return NextResponse.json({ error: 'TAT value must be greater than 0' }, { status: 400 });
            }

            if (!['hours', 'days'].includes(stepConfig.tatUnit)) {
                return NextResponse.json({ error: 'TAT unit must be either "hours" or "days"' }, { status: 400 });
            }
        }

        await updateO2DStepConfig(config);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating O2D config:', error);
        return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
    }
}
