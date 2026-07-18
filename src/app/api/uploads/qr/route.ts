import { NextRequest, NextResponse } from 'next/server';
import { storeUploads, getUploads } from './storage';
import { getApiUrl } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const images = formData.getAll('images') as File[];
    const fieldTypes = formData.getAll('fieldTypes') as string[];

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No images provided' },
        { status: 400 }
      );
    }

    // Forward to backend API
    const backendFormData = new FormData();
    backendFormData.append('sessionId', sessionId);
    
    images.forEach((image, index) => {
      backendFormData.append('images', image);
      if (fieldTypes[index]) {
        backendFormData.append('fieldTypes', fieldTypes[index]);
      }
    });

    // Create upload records
    const uploads = images.map((image, index) => ({
      _id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`,
      filename: image.name,
      fieldType: fieldTypes[index] || 'Inventory Image',
      sessionId,
      size: image.size,
      type: image.type,
      uploadedAt: new Date().toISOString(),
    }));

    try {
      const apiUrl = getApiUrl();
      const backendResponse = await fetch(`${apiUrl}/api/uploads/qr`, {
        method: 'POST',
        body: backendFormData,
        headers: {
          // Don't set Content-Type, let fetch set it with boundary for FormData
        },
      });

      if (backendResponse.ok) {
        // Backend stored successfully, also store locally for retrieval
        storeUploads(sessionId, uploads);
        const backendData = await backendResponse.json();
        return NextResponse.json(backendData);
      } else {
        // Backend not available, store locally
        console.warn('Backend not available, storing files information locally');
        storeUploads(sessionId, uploads);

        return NextResponse.json({
          success: true,
          uploads,
          message: 'Files uploaded successfully (stored locally)',
        });
      }
    } catch (backendError) {
      console.error('Backend error:', backendError);
      
      // Fallback: Store upload information locally
      storeUploads(sessionId, uploads);

      return NextResponse.json({
        success: true,
        uploads,
        message: 'Files uploaded successfully (stored locally - backend unavailable)',
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process upload', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

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

