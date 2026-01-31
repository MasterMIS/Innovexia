import { NextResponse } from 'next/server';
// import { sql } from '@/lib/db'; // Disabled - now using Google Sheets

// GET - Fetch remarks for a specific ticket
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // const remarks = await sql`
    //   SELECT * FROM helpdesk_remarks
    //   WHERE ticket_id = ${parseInt(ticketId)}
    //   ORDER BY created_at DESC
    // `;

    // return NextResponse.json(remarks, { status: 200 });
    return NextResponse.json([], { status: 200 }); // Return empty array for now to fix build
  } catch (error) {
    console.error('Error fetching helpdesk remarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch helpdesk remarks' },
      { status: 500 }
    );
  }
}

// POST - Add a remark to a ticket
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketId, userId, userName, remark } = body;

    if (!ticketId || !userId || !userName || !remark) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // const result = await sql`
    //   INSERT INTO helpdesk_remarks (
    //     ticket_id,
    //     user_id,
    //     user_name,
    //     remark
    //   )
    //   VALUES (
    //     ${ticketId},
    //     ${userId},
    //     ${userName},
    //     ${remark}
    //   )
    //   RETURNING *
    // `;

    // return NextResponse.json(result[0], { status: 201 });
    return NextResponse.json({}, { status: 201 }); // Return empty object for now
  } catch (error) {
    console.error('Error creating helpdesk remark:', error);
    return NextResponse.json(
      { error: 'Failed to create helpdesk remark' },
      { status: 500 }
    );
  }
}
