import { NextRequest, NextResponse } from 'next/server';
import { getDepartments, addDepartment, deleteDepartment } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const departments = await getDepartments();
    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      );
    }

    const result = await addDepartment(name.trim());
    return NextResponse.json({ department: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding department:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add department' },
      { status: error.message === 'Department already exists' ? 409 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      );
    }

    const result = await deleteDepartment(name);
    return NextResponse.json({ department: result });
  } catch (error: any) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete department' },
      { status: 500 }
    );
  }
}
