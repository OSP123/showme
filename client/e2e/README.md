# End-to-End Testing with Playwright

This directory contains E2E tests for ShowMe, focusing on multi-client sync functionality powered by ElectricSQL.

## Setup

Playwright and browsers are already installed. To run tests:

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in debug mode (step through tests)
npm run test:e2e:debug
```

## Test Files

### `multi-client-sync.spec.ts`
Comprehensive tests for ElectricSQL real-time sync:
- **Multi-client sync**: Verifies pins sync between browser windows within 2-3 seconds
- **Bidirectional sync**: Tests sync works in both directions  
- **Offline/online**: Verifies offline pin creation and sync when back online
- **Pin types**: Tests all pin types (medical, water, food, etc.) display correctly
- **Error detection**: Ensures no "malformed array literal" errors

## Prerequisites

Before running E2E tests:

1. **Start Docker services**:
   ```bash
   cd /Users/omar.patel/projects/personal/showme
   docker compose up -d
   ```

2. **Ensure ElectricSQL is healthy**:
   ```bash
   docker logs showme-electric-1 | grep "Configuring publication"
   # Should show: [{"public", "maps"}, {"public", "pins"}]
   ```

3. **Dev server will start automatically** when you run `npm run test:e2e`

## Writing Tests

Example test structure:

```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Create Map');
  // ... test logic
});
```

## Debugging Failed Tests

1. **View test report**: After tests run, open `playwright-report/index.html`
2. **Screenshots**: Failed tests automatically capture screenshots in `test-results/`
3. **Trace viewer**: Use `npx playwright show-trace trace.zip` for detailed debugging
4. **Debug mode**: Run `npm run test:e2e:debug` to step through tests

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Install dependencies
  run: npm ci
  
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium
  
- name: Run E2E tests
  run: npm run test:e2e
```

## Known Issues

- Tests require Docker services running locally
- First run may be slow due to IndexedDB initialization
- Sync timing tests may be flaky on slow machines (increase timeouts if needed)
