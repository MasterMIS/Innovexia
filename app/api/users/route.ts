import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, updateUser, deleteUser } from '@/lib/sheets';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, phone, roleId, imageUrl } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const userData = {
      username,
      email,
      password,
      phone: phone || '',
      roleId: roleId || 3,
      imageUrl: imageUrl || ''
    };

    const user = await createUser(userData);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, username, email, phone, roleId, imageUrl, password } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const userData: any = {
      email,
      phone,
      roleId: roleId || 3,
      imageUrl
    };

    // Only update password if provided
    if (password) {
      userData.password = password;
    }

    const user = await updateUser(parseInt(id), userData);
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await deleteUser(parseInt(id));
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
