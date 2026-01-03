import { NextRequest, NextResponse } from 'next/server';
import { getDelegationHistory } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const delegationId = request.nextUrl.searchParams.get('delegationId');

    if (!delegationId) {
      return NextResponse.json(
        { error: 'Delegation ID is required' },
        { status: 400 }
      );
    }

    const history = await getDelegationHistory(parseInt(delegationId));

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
