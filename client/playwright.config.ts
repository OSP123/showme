import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false, // Run tests serially for E2E sync tests
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Single worker for E2E tests
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3012',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Start local dev server before running tests
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3012',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
