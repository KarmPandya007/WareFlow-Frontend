/**
 * Development-only logger utility
 * Prevents console.logs from running in production
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  
  error: (...args: any[]) => {
    if (isDev) console.error(...args);
  },
  
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },
};

// For production error tracking (can be integrated with Sentry later)
export const trackError = (error: Error, context?: Record<string, any>) => {
  if (!isDev) {
    // Send to error tracking service in production
    // Example: Sentry.captureException(error, { extra: context });
  } else {
    console.error('Error:', error, 'Context:', context);
  }
};
