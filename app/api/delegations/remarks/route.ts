import { NextRequest, NextResponse } from 'next/server';
import { getDelegationRemarks, createDelegationRemark } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const delegationId = request.nextUrl.searchParams.get('delegationId');

    if (!delegationId) {
      return NextResponse.json(
        { error: 'Delegation ID is required' },
        { status: 400 }
      );
    }

    const remarks = await getDelegationRemarks(parseInt(delegationId));

    return NextResponse.json({ remarks });
  } catch (error) {
    console.error('Error fetching remarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch remarks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { delegationId, userId, remark, username } = await request.json();

    if (!delegationId || !userId || !remark) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const remarkData = {
      delegation_id: delegationId,
      user_id: userId,
      username: username || 'Unknown User',
      remark: remark
    };

    const result = await createDelegationRemark(remarkData);

    return NextResponse.json({ remark: result }, { status: 201 });
  } catch (error) {
    console.error('Error adding remark:', error);
    return NextResponse.json(
      { error: 'Failed to add remark' },
      { status: 500 }
    );
  }
}
