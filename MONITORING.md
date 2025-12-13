# Monitoring & Analytics Setup

## Error Tracking with Sentry

### 1. Create Sentry Account

1. Sign up at [sentry.io](https://sentry.io) (free tier available)
2. Create a new project
   - Platform: Browser
   - Alert frequency: Default or customize
3. Copy your DSN (looks like: `https://xxx@sentry.io/xxx`)

### 2. Configure in Production

Add to your deployment platform (Railway/Render):

```bash
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### 3. Verify Setup

1. Deploy your app
2. Trigger a test error:
   ```javascript
   // In browser console:
   throw new Error('Test Sentry error');
   ```
3. Check Sentry dashboard for the error

### Features Enabled

- ✅ Automatic error capture
- ✅ Breadcrumb tracking (user actions before error)
- ✅ Session replay (10% of sessions, 100% of errors)
- ✅ Performance monitoring
- ✅ Source maps (for readable stack traces)

---

## Analytics

Choose one of these privacy-focused options:

### Option 1: PostHog (Recommended)

**Pros**: Privacy-friendly, self-hostable, feature flags, session replay
**Free tier**: 1M events/month

#### Setup:

1. Sign up at [posthog.com](https://posthog.com)
2. Create a project
3. Copy your project key
4. Add to environment:
   ```bash
   VITE_POSTHOG_KEY=phc_xxxxx
   VITE_POSTHOG_HOST=https://app.posthog.com
   ```

### Option 2: Plausible

**Pros**: Super simple, privacy-first, GDPR compliant
**Cost**: $9/month (no free tier, but very affordable)

#### Setup:

1. Sign up at [plausible.io](https://plausible.io)
2. Add your domain
3. Add to environment:
   ```bash
   VITE_PLAUSIBLE_DOMAIN=your-domain.com
   ```

---

## Usage in Code

### Track Custom Events

```typescript
import { trackEvent, AnalyticsEvents } from './lib/monitoring';

// Track map creation
trackEvent({
  name: AnalyticsEvents.MAP_CREATED,
  properties: {
    is_private: false,
    fuzzing_enabled: true
  }
});

// Track pin addition
trackEvent({
  name: AnalyticsEvents.PIN_ADDED,
  properties: {
    type: 'medical',
    has_photo: false
  }
});
```

### Capture Errors

```typescript
import { captureError } from './lib/monitoring';

try {
  // risky operation
} catch (error) {
  captureError(error, {
    context: 'pin_creation',
    map_id: mapId
  });
}
```

---

## Events Tracked

### Automatic
- Page views
- JavaScript errors
- Network errors
- Performance metrics

### Custom Events
- `map_created` - New map created
- `pin_added` - Pin added to map  
- `pin_viewed` - Pin details viewed
- `map_shared` - Map share link copied
- `sync_error` - ElectricSQL sync failed
- `offline_mode` - App used offline
- `filter_applied` - Pin filter used

---

## Privacy Considerations

Both Sentry and our analytics options are privacy-focused:

- ✅ No personal data collected by default
- ✅ No cross-site tracking
- ✅ GDPR compliant
- ✅ Can be self-hosted (PostHog)
- ✅ Session replay masks sensitive data

### Data Collected

- Error messages and stack traces
- Page URLs visited
- Custom events (map/pin actions)
- Browser type and version
- Performance metrics

### NOT Collected

- Personal identifiable information
- Keystrokes or form data
- Specific pin locations (only actions)
- User email/name (unless explicitly set)

---

## Cost Estimate

### Free Setup
- Sentry: 5K errors/month free
- PostHog: 1M events/month free
- **Total: $0/month**

### Paid (if needed)
- Sentry Team: $26/month (50K errors)
- PostHog Scale: $0.00031/event after 1M
- Plausible: $9/month
- **Total: ~$35/month for heavy usage**

---

## Monitoring Dashboard

### Sentry Dashboard
- Real-time error tracking
- Performance monitoring
- Release tracking
- User feedback

### Analytics Dashboard  
- User count and sessions
- Most used features
- Error rates
- Performance metrics

---

## Next Steps

1. **Set up Sentry** (5 minutes)
   - Create account
   - Get DSN
   - Add to env vars
   - Deploy

2. **Choose Analytics** (5 minutes)
   - PostHog (recommended) or Plausible
   - Create account
   - Add credentials
   - Deploy

3. **Verify** (2 minutes)
   - Check Sentry for test error
   - Check analytics for page views
   - Test custom event tracking

4. **Configure Alerts** (optional)
   - Sentry: Email on new errors
   - PostHog: Weekly insights email
