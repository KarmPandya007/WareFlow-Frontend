// In-memory storage for QR uploads
// In production, replace this with a database or Redis cache

interface UploadRecord {
  _id: string;
  filename: string;
  fieldType: string;
  sessionId: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// Map of sessionId -> array of uploads
const uploadStorage = new Map<string, UploadRecord[]>();

export function storeUploads(sessionId: string, uploads: UploadRecord[]): void {
  const existing = uploadStorage.get(sessionId) || [];
  uploadStorage.set(sessionId, [...existing, ...uploads]);
}

export function getUploads(sessionId: string): UploadRecord[] {
  return uploadStorage.get(sessionId) || [];
}

export function clearUploads(sessionId: string): void {
  uploadStorage.delete(sessionId);
}

// Optional: Clean up old sessions (older than 24 hours)
export function cleanupOldSessions(): void {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  for (const [sessionId, uploads] of uploadStorage.entries()) {
    if (uploads.length > 0) {
      const oldestUpload = uploads[0];
      const uploadTime = new Date(oldestUpload.uploadedAt).getTime();
      
      if (now - uploadTime > oneDayMs) {
        uploadStorage.delete(sessionId);
      }
    }
  }
}

