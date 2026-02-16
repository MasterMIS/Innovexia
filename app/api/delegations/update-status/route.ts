import { NextRequest, NextResponse } from 'next/server';
import { getDelegationById, updateDelegation, createDelegationHistory, createDelegationRemark } from '@/lib/sheets';
import { formatToSheetDate, parseDateString } from '@/lib/dateUtils';

// Helper to parse date strings in multiple formats and return in sheet-friendly format
function parseDateForSheet(dateStr: string): string {
  if (!dateStr) return formatToSheetDate(new Date());

  // Use our robust library parser
  const parsedDate = parseDateString(dateStr);
  if (parsedDate && !isNaN(parsedDate.getTime())) {
    return formatToSheetDate(parsedDate);
  }

  return formatToSheetDate(new Date());
}

export async function POST(request: NextRequest) {
  try {
    const { delegationId, status, revisedDueDate, remark, userId, username, evidenceUrls } = await request.json();

    if (!delegationId || !status || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert delegationId to number if it's a string
    const id = typeof delegationId === 'string' ? parseInt(delegationId) : delegationId;

    // Get current delegation data
    const currentDelegation = await getDelegationById(id);

    if (!currentDelegation) {
      return NextResponse.json(
        { error: 'Delegation not found' },
        { status: 404 }
      );
    }

    const oldStatus = currentDelegation.status;
    const oldDueDate = currentDelegation.due_date;
    const newDueDate = revisedDueDate ? parseDateForSheet(revisedDueDate) : oldDueDate;

    // Update delegation
    await updateDelegation(id, {
      status: status,
      due_date: newDueDate,
      evidence_urls: evidenceUrls || null
    });

    // Create revision history record
    await createDelegationHistory({
      delegation_id: id,
      old_status: oldStatus,
      new_status: status,
      old_due_date: oldDueDate,
      new_due_date: newDueDate,
      reason: remark || null,
      evidence_urls: evidenceUrls || null
    });

    // Add remark if provided
    if (remark) {
      await createDelegationRemark({
        delegation_id: id,
        user_id: userId,
        username: username || 'Unknown User',
        remark: remark
      });
    }

    return NextResponse.json({ message: 'Status updated successfully' });
  } catch (error: any) {
    console.error('Error updating status:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: `Failed to update status: ${error.message}` },
      { status: 500 }
    );
  }
}
