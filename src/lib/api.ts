// API configuration utility
// In production, set NEXT_PUBLIC_API_URL environment variable
// For development, defaults to http://localhost:4000

export const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use public env variable or default to localhost
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  }
  
  // Server-side: use server env variable or default to localhost
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
};

