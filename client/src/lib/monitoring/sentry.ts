// Sentry error tracking initialization
import * as Sentry from '@sentry/browser';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.MODE;

export function initSentry() {
    if (!SENTRY_DSN) {
        console.log('Sentry DSN not configured, skipping error tracking setup');
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],

        // Performance Monitoring
        tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

        // Session Replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Filter out noise
        ignoreErrors: [
            // Browser extensions
            'top.GLOBALS',
            // Random plugins/extensions
            'originalCreateNotification',
            'canvas.contentDocument',
            'MyApp_RemoveAllHighlights',
            // Network errors
            'NetworkError',
            'Failed to fetch',
        ],

        beforeSend(event, hint) {
            // Don't send events in development
            if (ENVIRONMENT === 'development') {
                console.log('Sentry event (dev, not sent):', event);
                return null;
            }

            // Filter out localStorage quota errors (not critical)
            if (event.exception?.values?.[0]?.value?.includes('QuotaExceededError')) {
                return null;
            }

            return event;
        },
    });

    console.log('✅ Sentry initialized for', ENVIRONMENT);
}

// Capture custom errors
export function captureError(error: Error, context?: Record<string, any>) {
    if (ENVIRONMENT === 'development') {
        console.error('Error:', error, context);
        return;
    }

    Sentry.captureException(error, {
        extra: context,
    });
}

// Capture custom messages
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (ENVIRONMENT === 'development') {
        console.log(`[${level}]`, message);
        return;
    }

    Sentry.captureMessage(message, level);
}

// Set user context
export function setUser(userId: string, email?: string) {
    Sentry.setUser({
        id: userId,
        email,
    });
}

// Clear user context
export function clearUser() {
    Sentry.setUser(null);
}
