import { NextResponse } from 'next/server';
import {
  getHelpdeskTickets,
  createHelpdeskTicket,
  updateHelpdeskTicket,
  deleteHelpdeskTicket
} from '@/lib/sheets';

// Helper function to add IST offset
function addISTOffset(date: Date): Date {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  return new Date(date.getTime() + istOffset);
}

// GET - Fetch all helpdesk tickets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    const filters: any = {};
    if (userId) filters.userId = userId;
    if (status) filters.status = status;
    if (assignedTo) filters.assignedTo = assignedTo;

    const tickets = await getHelpdeskTickets(filters);

    return NextResponse.json(tickets, { status: 200 });
  } catch (error) {
    console.error('Error fetching helpdesk tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch helpdesk tickets' },
      { status: 500 }
    );
  }
}

// POST - Create a new helpdesk ticket
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      raisedBy,
      raisedByName,
      category,
      priority,
      subject,
      description,
      assignedTo,
      assignedToName,
      accountablePerson,
      accountablePersonName,
      desiredDate,
      attachments
    } = body;

    // Validate required fields
    if (!raisedBy || !raisedByName || !category || !priority || !subject || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate ticket number (format: TKT-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TKT-${dateStr}-${randomNum}`;

    // Prepare ticket data
    const ticketData = {
      ticket_number: ticketNumber,
      raised_by: raisedBy,
      raised_by_name: raisedByName,
      category,
      priority,
      subject,
      description,
      assigned_to: assignedTo || null,
      assigned_to_name: assignedToName || null,
      accountable_person: accountablePerson || null,
      accountable_person_name: accountablePersonName || null, // Ensure this field exists in defaultHeaders in sheets.ts if used
      desired_date: desiredDate ? addISTOffset(new Date(desiredDate)).toISOString() : null,
      status: 'raised',
      attachments: attachments ? JSON.stringify(attachments) : null,
    };

    const newTicket = await createHelpdeskTicket(ticketData);

    return NextResponse.json(newTicket, { status: 201 });
  } catch (error) {
    console.error('Error creating helpdesk ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create helpdesk ticket' },
      { status: 500 }
    );
  }
}

// PUT - Update a helpdesk ticket
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      ...updateData
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Map frontend fields to sheet columns if necessary or pass directly if keys match
    // The previous implementation utilized 'ticketData' spread.
    // We should ensure keys match what createHelpdeskTicket expects/sheets.ts uses.
    // sheets.ts functions use rowToObject keys which usually match DB columns.

    // Transform camelCase to snake_case where appropriate based on lib/sheets.ts usage
    const transformedData: any = {};
    if (updateData.status !== undefined) transformedData.status = updateData.status;
    if (updateData.category !== undefined) transformedData.category = updateData.category;
    if (updateData.priority !== undefined) transformedData.priority = updateData.priority;
    if (updateData.subject !== undefined) transformedData.subject = updateData.subject;
    if (updateData.description !== undefined) transformedData.description = updateData.description;
    if (updateData.assignedTo !== undefined) transformedData.assigned_to = updateData.assignedTo;
    if (updateData.assignedToName !== undefined) transformedData.assigned_to_name = updateData.assignedToName;
    if (updateData.accountablePerson !== undefined) transformedData.accountable_person = updateData.accountablePerson;
    if (updateData.accountablePersonName !== undefined) transformedData.accountable_person_name = updateData.accountablePersonName;
    if (updateData.desiredDate !== undefined) transformedData.desired_date = updateData.desiredDate ? addISTOffset(new Date(updateData.desiredDate)).toISOString() : null;
    if (updateData.remarks !== undefined) transformedData.remarks = updateData.remarks;
    if (updateData.resolvedAt !== undefined) transformedData.resolved_at = updateData.resolvedAt ? addISTOffset(new Date(updateData.resolvedAt)).toISOString() : null;

    const updatedTicket = await updateHelpdeskTicket(parseInt(id), transformedData);

    return NextResponse.json(updatedTicket, { status: 200 });
  } catch (error) {
    console.error('Error updating helpdesk ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update helpdesk ticket' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a helpdesk ticket
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    await deleteHelpdeskTicket(parseInt(id));

    return NextResponse.json({ success: true, message: 'Ticket deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting helpdesk ticket:', error);
    return NextResponse.json(
      { error: 'Failed to delete helpdesk ticket' },
      { status: 500 }
    );
  }
}
