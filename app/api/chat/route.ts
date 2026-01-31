import { NextRequest, NextResponse } from 'next/server';
import { getChatMessages, createChatMessage } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const messages = await getChatMessages();
    return NextResponse.json({ messages });
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
    const body = await request.json();
    const message = await createChatMessage(body);
    return NextResponse.json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
