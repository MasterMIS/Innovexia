import { NextRequest, NextResponse } from 'next/server';
import { getDelegationById, updateDelegation, createDelegationHistory, createDelegationRemark } from '@/lib/sheets';

// Helper to format date to dd/mm/yyyy HH:mm:ss
function formatDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Helper to parse date strings in multiple formats
function parseDateString(dateStr: string): string {
  if (!dateStr) return formatDateTime(new Date());

  // If already in dd/mm/yyyy HH:mm:ss format, return as-is
  const ddmmyyyyMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  if (ddmmyyyyMatch) {
    return dateStr;
  }

  // If in YYYY-MM-DDTHH:mm format (datetime-local)
  const datetimeMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (datetimeMatch) {
    const [_, year, month, day, hours, minutes] = datetimeMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
    return formatDateTime(date);
  }

  // Try to parse as Date and format
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return formatDateTime(date);
    }
  } catch (e) {
    console.error('Error parsing date:', e);
  }

  return formatDateTime(new Date());
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
    const newDueDate = revisedDueDate ? parseDateString(revisedDueDate) : oldDueDate;

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
