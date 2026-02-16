import { NextRequest, NextResponse } from 'next/server';
import { getChecklistById, updateChecklist, createChecklistHistory, createChecklistRemark } from '@/lib/sheets';

// Helper to format date to dd/mm/yyyy HH:mm:ss
function formatDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export async function POST(request: NextRequest) {
  try {
    const { checklistId, status, remark, userId, username, attachmentUrl } = await request.json();

    if (!checklistId || !status || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse checklistId to ensure it's a number
    const parsedChecklistId = typeof checklistId === 'string' ? parseInt(checklistId) : checklistId;

    console.log('Updating checklist:', { parsedChecklistId, status, userId, username });

    // Fetch current checklist
    const currentChecklist = await getChecklistById(parsedChecklistId);

    console.log('Fetched checklist:', currentChecklist);

    if (!currentChecklist) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 }
      );
    }

    const oldStatus = currentChecklist.status || 'pending';
    const now = new Date().toISOString();

    // Update checklist status
    const updatedData: any = {
      status: status,
      updated_at: now
    };

    // Removed attachment_url update for checklist sheet as per new requirement
    // Attachments are now only tracked in history to support multiple files


    await updateChecklist(parsedChecklistId, updatedData);

    // Create history record
    const historyData = {
      checklist_id: parsedChecklistId,
      user_id: userId,
      username: username || 'Unknown User',
      action: 'status_change',
      old_status: oldStatus,
      new_status: status,
      remark: remark || null,
      attachment_url: attachmentUrl || null,
      timestamp: now
    };

    await createChecklistHistory(historyData);

    // If remark provided, also save to remarks table
    if (remark) {
      const remarkData = {
        checklist_id: parsedChecklistId,
        user_id: userId,
        username: username || 'Unknown User',
        remark: remark
      };
      await createChecklistRemark(remarkData);
    }

    return NextResponse.json({
      message: 'Checklist status updated successfully',
      status: status
    });
  } catch (error) {
    console.error('Error updating checklist status:', error);
    return NextResponse.json(
      { error: 'Failed to update checklist status' },
      { status: 500 }
    );
  }
}
