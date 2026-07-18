import { NextRequest, NextResponse } from 'next/server';
import { getUploads, storeUploads } from '../storage';
import { getApiUrl } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Try to fetch from backend first
    try {
      const apiUrl = getApiUrl();
      const backendResponse = await fetch(`${apiUrl}/api/uploads/qr/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        // Also update local storage with backend data
        if (backendData.success && backendData.uploads) {
          storeUploads(sessionId, backendData.uploads);
        }
        return NextResponse.json(backendData);
      }
    } catch (backendError) {
      console.error('Backend fetch error:', backendError);
    }

    // Fallback: Get from local storage
    const localUploads = getUploads(sessionId);
    return NextResponse.json({
      success: true,
      uploads: localUploads,
      message: localUploads.length > 0 
        ? 'Retrieved uploads from local storage' 
        : 'No uploads found for this session',
    });
  } catch (error) {
    console.error('Get uploads error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch uploads', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

