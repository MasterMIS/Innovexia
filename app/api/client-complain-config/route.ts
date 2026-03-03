import { NextResponse } from 'next/server';
import { getClientComplainConfig, updateClientComplainConfig } from '@/lib/sheets';

export async function GET() {
    try {
        const config = await getClientComplainConfig();
        return NextResponse.json({ config });
    } catch (error: any) {
        console.error('Error in GET /api/client-complain-config:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { config } = body;

        if (!config || !Array.isArray(config)) {
            return NextResponse.json({ error: 'Invalid config data' }, { status: 400 });
        }

        await updateClientComplainConfig(config);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in PUT /api/client-complain-config:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
