import { NextRequest, NextResponse } from 'next/server';
import { getDelegations, createDelegation, updateDelegation, deleteDelegation } from '@/lib/sheets';

// Helper function to add IST offset for database storage
function addISTOffset(date: Date): Date {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  return new Date(date.getTime() + istOffset);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const delegations = await getDelegations(parseInt(userId));

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
      doerName,
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
    const now = new Date();
    const adjustedCreatedAt = addISTOffset(now);
    const adjustedDueDate = dueDate ? addISTOffset(new Date(dueDate)).toISOString() : null;

    const delegationData = {
      user_id: userId,
      delegation_name: delegationName,
      description: description || null,
      assigned_to: assignedTo,
      doer_name: doerName || null,
      department: department || null,
      priority: priority || 'medium',
      due_date: adjustedDueDate,
      status: status,
      voice_note_url: voiceNoteUrl || null,
      reference_docs: referenceDocs || null,
      evidence_required: evidenceRequired || false,
      created_at: adjustedCreatedAt.toISOString()
    };

    const result = await createDelegation(delegationData);

    return NextResponse.json({ delegation: result }, { status: 201 });
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
    const now = new Date();
    const adjustedUpdatedAt = addISTOffset(now);
    const adjustedDueDate = dueDate ? addISTOffset(new Date(dueDate)).toISOString() : null;

    const delegationData = {
      delegation_name: delegationName,
      description: description || null,
      assigned_to: assignedTo,
      doer_name: doerName || null,
      department: department || null,
      priority: priority || 'medium',
      status: status,
      due_date: adjustedDueDate,
      voice_note_url: voiceNoteUrl || null,
      reference_docs: referenceDocs || null,
      evidence_required: evidenceRequired || false,
      updated_at: adjustedUpdatedAt.toISOString()
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
    return NextResponse.json(
      { error: 'Failed to update delegation' },
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
