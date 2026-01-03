import { NextResponse } from 'next/server';
// import { sql } from '@/lib/db'; // Disabled - now using Google Sheets

// Helper function to add IST offset for database storage
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

    let query;
    
    if (status) {
      query = sql`
        SELECT * FROM helpdesk_tickets 
        WHERE status = ${status}
        ORDER BY created_at DESC
      `;
    } else if (assignedTo) {
      query = sql`
        SELECT * FROM helpdesk_tickets 
        WHERE assigned_to = ${parseInt(assignedTo)}
        ORDER BY created_at DESC
      `;
    } else if (userId) {
      query = sql`
        SELECT * FROM helpdesk_tickets 
        WHERE raised_by = ${parseInt(userId)} OR assigned_to = ${parseInt(userId)}
        ORDER BY created_at DESC
      `;
    } else {
      query = sql`
        SELECT * FROM helpdesk_tickets 
        ORDER BY created_at DESC
      `;
    }

    const tickets = await query;

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

    // Add IST offset to timestamps
    const now = new Date();
    const adjustedCreatedAt = addISTOffset(now);
    const adjustedDesiredDate = desiredDate ? addISTOffset(new Date(desiredDate)).toISOString() : null;

    const result = await sql`
      INSERT INTO helpdesk_tickets (
        ticket_number,
        raised_by,
        raised_by_name,
        category,
        priority,
        subject,
        description,
        assigned_to,
        assigned_to_name,
        accountable_person,
        accountable_person_name,
        desired_date,
        status,
        attachments,
        created_at
      )
      VALUES (
        ${ticketNumber},
        ${raisedBy},
        ${raisedByName},
        ${category},
        ${priority},
        ${subject},
        ${description},
        ${assignedTo || null},
        ${assignedToName || null},
        ${accountablePerson || null},
        ${accountablePersonName || null},
        ${adjustedDesiredDate},
        'raised',
        ${attachments ? JSON.stringify(attachments) : null},
        ${adjustedCreatedAt.toISOString()}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
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
      status,
      assignedTo,
      assignedToName,
      accountablePerson,
      accountablePersonName,
      desiredDate,
      remarks,
      resolvedAt,
      category,
      priority,
      subject,
      description
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateFields: any = {};
    
    if (status !== undefined) updateFields.status = status;
    if (category !== undefined) updateFields.category = category;
    if (priority !== undefined) updateFields.priority = priority;
    if (subject !== undefined) updateFields.subject = subject;
    if (description !== undefined) updateFields.description = description;
    if (assignedTo !== undefined) updateFields.assigned_to = assignedTo;
    if (assignedToName !== undefined) updateFields.assigned_to_name = assignedToName;
    if (accountablePerson !== undefined) updateFields.accountable_person = accountablePerson;
    if (accountablePersonName !== undefined) updateFields.accountable_person_name = accountablePersonName;
    if (desiredDate !== undefined) {
      updateFields.desired_date = addISTOffset(new Date(desiredDate)).toISOString();
    }
    if (remarks !== undefined) updateFields.remarks = remarks;
    if (resolvedAt !== undefined) {
      updateFields.resolved_at = addISTOffset(new Date(resolvedAt)).toISOString();
    }
    
    // Add IST offset to updated_at
    const now = new Date();
    const adjustedUpdatedAt = addISTOffset(now);
    updateFields.updated_at = adjustedUpdatedAt.toISOString();

    // Build the SET clause and values array
    const keys = Object.keys(updateFields);
    const values: any[] = Object.values(updateFields);
    
    // Create SET clause with placeholders
    const setClause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    // Add id to values array for WHERE clause
    values.push(id);
    const idPlaceholder = values.length;

    // Use sql.unsafe for dynamic query
    const result = await sql.unsafe(
      `UPDATE helpdesk_tickets SET ${setClause} WHERE id = $${idPlaceholder} RETURNING *`,
      values
    );

    return NextResponse.json(result[0], { status: 200 });
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

    // Delete associated remarks first
    await sql`DELETE FROM helpdesk_remarks WHERE ticket_id = ${parseInt(id)}`;

    // Delete the ticket
    await sql`DELETE FROM helpdesk_tickets WHERE id = ${parseInt(id)}`;

    return NextResponse.json({ success: true, message: 'Ticket deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting helpdesk ticket:', error);
    return NextResponse.json(
      { error: 'Failed to delete helpdesk ticket' },
      { status: 500 }
    );
  }
}
