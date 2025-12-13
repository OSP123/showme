// Monitoring initialization - call this early in app startup
export { initSentry, captureError, captureMessage, setUser, clearUser } from './sentry';
export { initAnalytics, trackEvent, trackPageView, AnalyticsEvents } from './analytics';
import { initSentry } from './sentry';
import { initAnalytics } from './analytics';

// Initialize all monitoring
export function initMonitoring() {
    initSentry();
    initAnalytics();
}
