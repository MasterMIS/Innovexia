import { NextRequest, NextResponse } from 'next/server';
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo
} from '@/lib/sheets';

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

    // In a real scenario, we might filter by user_id from session/cookie
    // For now, we fetch all todos (or filter logic needs to be enhanced in sheets.ts if needed)

    // Attempt to extract userId from headers/cookies if available to filter?
    // The previous SQL used session/cookie auth but fetched ALL todos?
    // No, standard patterns usually filter. 
    // The previous code: `SELECT ... FROM todos` didn't have WHERE user_id
    // But typically Todo apps are user specific.
    // However, the previous code fetched all. Let's stick to previous behavior or improve?
    // Previous code: `SELECT ... FROM todos t ...` with no WHERE clause for user.
    // It seems it was a shared todo list or incomplete implementation.
    // Let's implement getTodos().

    const todos = await getTodos();

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

    // Use sheet headers logic: 
    // 'id', 'title', 'description', 'priority', 'status', 'category', 'is_important', 'assigned_to', 'user_id'

    // Note: 'category' was hardcoded to 'inbox' in previous SQL.

    const todoData = {
      title,
      description: description || null,
      priority: priority || 'medium',
      status: status || 'pending',
      category: 'inbox',
      assigned_to: assigned_to || null,
      user_id,
      is_important: false
    };

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const newTodo = await createTodo(todoData);

    return NextResponse.json(newTodo, { status: 201 });
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
      ...updateFields
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    const updatedTodo = await updateTodo(parseInt(id), updateFields);

    return NextResponse.json(updatedTodo);
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

    await deleteTodo(parseInt(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
