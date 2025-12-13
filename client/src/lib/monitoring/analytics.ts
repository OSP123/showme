// Privacy-focused analytics
// Supports PostHog or Plausible

type AnalyticsEvent = {
    name: string;
    properties?: Record<string, any>;
};

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST;
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
const ENVIRONMENT = import.meta.env.MODE;

let analyticsEnabled = false;

// Initialize analytics
export function initAnalytics() {
    if (ENVIRONMENT === 'development') {
        console.log('Analytics disabled in development');
        return;
    }

    // PostHog initialization
    if (POSTHOG_KEY && POSTHOG_HOST) {
        loadPostHog();
        analyticsEnabled = true;
        return;
    }

    // Plausible initialization (script-based, no SDK needed)
    if (PLAUSIBLE_DOMAIN) {
        loadPlausible();
        analyticsEnabled = true;
        return;
    }

    console.log('No analytics provider configured');
}

// Load PostHog
function loadPostHog() {
    const script = document.createElement('script');
    script.src = 'https://app.posthog.com/static/array.js';
    script.async = true;
    script.onload = () => {
        // @ts-ignore
        window.posthog = window.posthog || [];
        // @ts-ignore
        window.posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            autocapture: false, // Manual tracking only
            capture_pageview: true,
            disable_session_recording: false,
        });
        console.log('✅ PostHog initialized');
    };
    document.head.appendChild(script);
}

// Load Plausible
function loadPlausible() {
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.domain = PLAUSIBLE_DOMAIN;
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
    console.log('✅ Plausible initialized');
}

// Track custom events
export function trackEvent(event: AnalyticsEvent) {
    if (!analyticsEnabled || ENVIRONMENT === 'development') {
        console.log('[Analytics]', event.name, event.properties);
        return;
    }

    // PostHog
    // @ts-ignore
    if (window.posthog) {
        // @ts-ignore
        window.posthog.capture(event.name, event.properties);
    }

    // Plausible
    // @ts-ignore
    if (window.plausible) {
        // @ts-ignore
        window.plausible(event.name, { props: event.properties });
    }
}

// Track page views
export function trackPageView(path: string) {
    if (!analyticsEnabled || ENVIRONMENT === 'development') {
        console.log('[Analytics] Page view:', path);
        return;
    }

    // PostHog tracks automatically
    // Plausible tracks automatically

    // Manual tracking if needed
    trackEvent({ name: 'pageview', properties: { path } });
}

// Common events
export const AnalyticsEvents = {
    MAP_CREATED: 'map_created',
    PIN_ADDED: 'pin_added',
    PIN_VIEWED: 'pin_viewed',
    MAP_SHARED: 'map_shared',
    SYNC_ERROR: 'sync_error',
    OFFLINE_MODE: 'offline_mode',
    FILTER_APPLIED: 'filter_applied',
} as const;
