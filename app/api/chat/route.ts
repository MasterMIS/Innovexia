// import { sql } from '@/lib/db'; // Disabled - now using Google Sheets
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // TODO: Migrate chat to Google Sheets
    // Temporarily return empty array
    return NextResponse.json({ messages: [] });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Migrate chat to Google Sheets
    // Temporarily disabled
    return NextResponse.json(
      { error: 'Chat feature temporarily disabled during migration to Google Sheets' },
      { status: 503 }
    );
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
