import { NextResponse } from 'next/server';

// Temporary hardcoded roles data - replace with Google Sheets when ready
const ROLES_DATA = [
  { id: 1, role_name: 'Admin' },
  { id: 2, role_name: 'Manager' },
  { id: 3, role_name: 'User' }
];

export async function GET() {
  try {
    // TODO: Replace with Google Sheets implementation
    return NextResponse.json({ roles: ROLES_DATA });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}
