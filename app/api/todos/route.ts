// import { sql } from '@/lib/db'; // Disabled - now using Google Sheets
import { NextRequest, NextResponse } from 'next/server';

// GET todos
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookies = request.headers.get('cookie');
    const authCookie = cookies
      ?.split(';')
      .find((c) => c.trim().startsWith(`auth-${sessionId}`));

    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todos = await sql`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.priority,
        t.status,
        t.category,
        t.is_important,
        t.assigned_to,
        t.user_id,
        t.created_at,
        t.updated_at,
        u.username,
        u.image_url
      FROM todos t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY 
        CASE WHEN t.is_important THEN 0 ELSE 1 END,
        t.created_at DESC
    `;

    return NextResponse.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

// POST new todo
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookies = request.headers.get('cookie');
    const authCookie = cookies
      ?.split(';')
      .find((c) => c.trim().startsWith(`auth-${sessionId}`));

    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority, status, assigned_to, user_id } = body;

    if (!title || !user_id) {
      return NextResponse.json(
        { error: 'Title and user_id are required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO todos (title, description, priority, status, category, assigned_to, user_id)
      VALUES (${title}, ${description || null}, ${priority || 'medium'}, ${status || 'pending'}, 'inbox', ${assigned_to || null}, ${user_id})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}

// PUT update todo
export async function PUT(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookies = request.headers.get('cookie');
    const authCookie = cookies
      ?.split(';')
      .find((c) => c.trim().startsWith(`auth-${sessionId}`));

    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      title,
      description,
      priority,
      status,
      category,
      is_important,
      assigned_to,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE todos 
      SET 
        title = ${title},
        description = ${description || null},
        priority = ${priority || 'medium'},
        status = ${status || 'pending'},
        category = ${category || 'inbox'},
        is_important = ${is_important || false},
        assigned_to = ${assigned_to || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

// DELETE todo
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookies = request.headers.get('cookie');
    const authCookie = cookies
      ?.split(';')
      .find((c) => c.trim().startsWith(`auth-${sessionId}`));

    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM todos WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
