import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Fetch the resource from Google Drive
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch from Google Drive: ${response.status} ${response.statusText}`, imageUrl);
      throw new Error(`Failed to fetch resource: ${response.statusText}`);
    }

    // Get the resource data
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    // Return the resource with appropriate headers for both images and audio
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    };

    // Add content length if available
    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    // Different caching strategy for audio vs images
    if (contentType.startsWith('audio/')) {
      headers['Cache-Control'] = 'public, max-age=86400'; // 1 day cache for audio
    } else {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // Long cache for images
    }

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Error proxying resource:', error);
    
    // Return a 1x1 transparent pixel as fallback
    const transparentPixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    
    return new NextResponse(transparentPixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
