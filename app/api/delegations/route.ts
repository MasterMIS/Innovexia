import { NextRequest, NextResponse } from 'next/server';
import { getDelegations, createDelegation, updateDelegation, deleteDelegation } from '@/lib/sheets';

// Format date as dd/mm/yyyy HH:mm:ss
function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Parse date string and return formatted string
function parseDateString(dateStr: string): string | null {
  if (!dateStr) return null;

  // If already in dd/mm/yyyy HH:mm:ss format, return as is
  if (/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/.test(dateStr)) {
    return dateStr;
  }

  // Handle YYYY-MM-DDTHH:mm format from datetime-local
  const datetimeMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (datetimeMatch) {
    const [_, year, month, day, hours, minutes] = datetimeMatch;
    return `${day}/${month}/${year} ${hours}:${minutes}:00`;
  }

  // Fallback: try to parse as Date
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return formatDateTime(date);
    }
  } catch (e) {
    console.error('Error parsing date:', e);
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const role = request.nextUrl.searchParams.get('role');
    const username = request.nextUrl.searchParams.get('username');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const delegations = await getDelegations(parseInt(userId), role || undefined, username || undefined);

    return NextResponse.json({ delegations });
  } catch (error) {
    console.error('Error fetching delegations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delegations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      delegationName,
      description,
      assignedTo,
      doers, // Array of doers
      department,
      priority,
      dueDate,
      voiceNoteUrl,
      referenceDocs,
      evidenceRequired
    } = await request.json();

    if (!userId || !delegationName || !assignedTo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate dynamic status based on due date
    let status = 'pending';
    if (dueDate) {
      const now = new Date();
      const due = new Date(dueDate);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

      if (due < now) {
        status = 'overdue';
      } else if (dueDay.getTime() === today.getTime()) {
        status = 'pending';
      } else {
        status = 'planned';
      }
    }

    // Add IST offset to timestamps
    const adjustedDueDate = parseDateString(dueDate);

    // Handle multiple doers - create separate delegation for each doer
    const doersArray = doers && doers.length > 0 ? doers : [null];
    const createdDelegations = [];

    for (const doer of doersArray) {
      const delegationData = {
        user_id: userId,
        delegation_name: delegationName,
        description: description || null,
        assigned_to: assignedTo,
        doer_name: doer,
        department: department || null,
        priority: priority || 'medium',
        due_date: adjustedDueDate,
        status: status,
        voice_note_url: voiceNoteUrl || null,
        reference_docs: referenceDocs || null,
        evidence_required: evidenceRequired || false,
      };

      const result = await createDelegation(delegationData);
      createdDelegations.push(result);
    }

    return NextResponse.json({
      delegation: createdDelegations[0], // Return first one for backward compatibility
      count: createdDelegations.length
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating delegation:', error);
    console.error('Error details:', error.message);
    return NextResponse.json(
      { error: `Failed to create delegation: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      delegationName,
      description,
      assignedTo,
      doerName,
      doers, // Add doers array
      department,
      priority,
      dueDate,
      voiceNoteUrl,
      referenceDocs,
      evidenceRequired
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Delegation ID is required' },
        { status: 400 }
      );
    }

    // Calculate dynamic status based on due date
    let status = 'pending';
    if (dueDate) {
      try {
        const now = new Date();
        let due: Date;

        // Parse the date based on format
        const datetimeMatch = dueDate.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        const ddmmyyyyMatch = dueDate.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);

        if (datetimeMatch) {
          const [_, year, month, day, hours, minutes] = datetimeMatch;
          due = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
        } else if (ddmmyyyyMatch) {
          const [_, day, month, year, hours, minutes, seconds] = ddmmyyyyMatch;
          due = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds));
        } else {
          due = new Date(dueDate);
        }

        if (!isNaN(due.getTime())) {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

          if (due < now) {
            status = 'overdue';
          } else if (dueDay.getTime() === today.getTime()) {
            status = 'pending';
          } else {
            status = 'planned';
          }
        }
      } catch (e) {
        console.error('Error parsing due date for status:', e);
      }
    }

    // Add IST offset to timestamps
    const now = new Date();
    const adjustedDueDate = parseDateString(dueDate);

    // Determine doer name: prioritize doerName, then first element of doers array
    const resolvedDoerName = doerName || (doers && doers.length > 0 ? doers[0] : null);

    const delegationData = {
      delegation_name: delegationName,
      description: description || null,
      assigned_to: assignedTo,
      doer_name: resolvedDoerName, // Updated logic
      department: department || null,
      priority: priority || 'medium',
      status: status,
      due_date: adjustedDueDate,
      voice_note_url: voiceNoteUrl || null,
      reference_docs: referenceDocs || null,
      evidence_required: evidenceRequired || false,
    };

    const result = await updateDelegation(id, delegationData);

    if (!result) {
      return NextResponse.json(
        { error: 'Delegation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ delegation: result });
  } catch (error) {
    console.error('Error updating delegation:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to update delegation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Delegation ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteDelegation(parseInt(id));

    if (!result) {
      return NextResponse.json(
        { error: 'Delegation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Delegation deleted successfully' });
  } catch (error) {
    console.error('Error deleting delegation:', error);
    return NextResponse.json(
      { error: 'Failed to delete delegation' },
      { status: 500 }
    );
  }
}
