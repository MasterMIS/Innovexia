import { NextRequest, NextResponse } from 'next/server';
import { getChecklistRemarks, createChecklistRemark } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const checklistId = request.nextUrl.searchParams.get('checklistId');

    if (!checklistId) {
      return NextResponse.json(
        { error: 'Checklist ID is required' },
        { status: 400 }
      );
    }

    const remarks = await getChecklistRemarks(parseInt(checklistId));

    return NextResponse.json({ remarks });
  } catch (error) {
    console.error('Error fetching checklist remarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist remarks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { checklistId, userId, remark, username } = await request.json();

    if (!checklistId || !userId || !remark) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const remarkData = {
      checklist_id: checklistId,
      user_id: userId,
      username: username || 'Unknown User',
      remark: remark
    };

    const result = await createChecklistRemark(remarkData);

    return NextResponse.json({ remark: result }, { status: 201 });
  } catch (error) {
    console.error('Error adding checklist remark:', error);
    return NextResponse.json(
      { error: 'Failed to add checklist remark' },
      { status: 500 }
    );
  }
}
