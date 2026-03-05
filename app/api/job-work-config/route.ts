import { NextResponse } from 'next/server';
import { getJobWorkConfig, updateJobWorkConfig } from '@/lib/sheets';

export async function GET() {
    try {
        const config = await getJobWorkConfig();
        return NextResponse.json({ config });
    } catch (error: any) {
        console.error('Error fetching Job Work config:', error);
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { config } = await request.json();
        if (!config || !Array.isArray(config)) {
            return NextResponse.json({ error: 'Invalid config data' }, { status: 400 });
        }
        const result = await updateJobWorkConfig(config);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error updating Job Work config:', error);
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}
