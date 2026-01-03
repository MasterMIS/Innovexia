import { NextRequest, NextResponse } from 'next/server';
import { getDelegationById, updateDelegation, createDelegationHistory, createDelegationRemark } from '@/lib/sheets';

export async function POST(request: NextRequest) {
  try {
    const { delegationId, status, revisedDueDate, remark, userId, username } = await request.json();

    if (!delegationId || !status || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current delegation data
    const currentDelegation = await getDelegationById(delegationId);

    if (!currentDelegation) {
      return NextResponse.json(
        { error: 'Delegation not found' },
        { status: 404 }
      );
    }

    const oldStatus = currentDelegation.status;
    const oldDueDate = currentDelegation.due_date;
    const newDueDate = revisedDueDate || oldDueDate;

    // Update delegation
    await updateDelegation(delegationId, {
      status: status,
      due_date: newDueDate,
      updated_at: new Date().toISOString()
    });

    // Create revision history record
    await createDelegationHistory({
      delegation_id: delegationId,
      old_status: oldStatus,
      new_status: status,
      old_due_date: oldDueDate,
      new_due_date: newDueDate,
      reason: remark || null
    });

    // Add remark if provided
    if (remark) {
      await createDelegationRemark({
        delegation_id: delegationId,
        user_id: userId,
        username: username || 'Unknown User',
        remark: remark
      });
    }

    return NextResponse.json({ message: 'Status updated successfully' });
  } catch (error: any) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: `Failed to update status: ${error.message}` },
      { status: 500 }
    );
  }
}
