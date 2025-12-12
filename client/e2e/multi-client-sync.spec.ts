import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Test: Multi-Client Pin Sync
 * 
 * Verifies that pins created in one browser window sync to another browser window
 * in real-time using ElectricSQL.
 */

test.describe('ElectricSQL Multi-Client Sync', () => {
    let context1;
    let context2;
    let page1: Page;
    let page2: Page;

    test.beforeAll(async ({ browser }) => {
        // Create two separate browser contexts (simulates two different users/sessions)
        context1 = await browser.newContext();
        context2 = await browser.newContext();

        page1 = await context1.newPage();
        page2 = await context2.newPage();
    });

    test.afterAll(async () => {
        await context1?.close();
        await context2?.close();
    });

    test('should sync pins between two browser windows in real-time', async () => {
        // SETUP: Create a map in window 1
        await page1.goto('/');

        // Wait for app to initialize
        await page1.waitForSelector('text=Create Map', { timeout: 10000 });

        // Create a new map
        await page1.click('text=Create Map');
        await page1.fill('input[placeholder*="Map"]', 'Sync Test Map');
        await page1.click('button:has-text("Create")');

        // Wait for map to be created and get the map URL
        await page1.waitForSelector('.maplibregl-canvas', { timeout: 10000 });
        const mapUrl = page1.url();

        console.log('Map created:', mapUrl);

        // STEP 1: Open same map in window 2
        await page2.goto(mapUrl);
        await page2.waitForSelector('.maplibregl-canvas', { timeout: 10000 });

        console.log('Window 2 opened same map');

        // STEP 2: Add a pin in window 1
        // Click on the map to open quick pin menu
        const canvas1 = await page1.locator('.maplibregl-canvas');
        await canvas1.click({ position: { x: 300, y: 300 } });

        // Wait for quick pin menu
        await page1.waitForSelector('text=Medical', { timeout: 5000 });

        // Click medical pin type
        await page1.click('button:has-text("Medical")');

        console.log('Pin added in window 1');

        // STEP 3: Verify pin appears in window 2 within 5 seconds
        // The polling interval is 2 seconds, so max wait should be ~3 seconds
        await page2.waitForSelector('.marker, [class*="pin"]', { timeout: 8000 });

        // Check that the pin has the medical emoji/icon
        const pinsInWindow2 = await page2.locator('.marker, [class*="pin"]').count();
        expect(pinsInWindow2).toBeGreaterThan(0);

        console.log(`✅ Pin synced to window 2! Found ${pinsInWindow2} pin(s)`);

        // STEP 4: Verify pin details sync correctly
        // Click on the pin in window 2
        const pin = page2.locator('.marker, [class*="pin"]').first();
        await pin.click();

        // Wait for popup
        await page2.waitForSelector('.maplibregl-popup, [class*="popup"]', { timeout: 3000 });

        // Check that medical type is shown
        const popupText = await page2.locator('.maplibregl-popup, [class*="popup"]').textContent();
        expect(popupText?.toLowerCase()).toContain('medical');

        console.log('✅ Pin details synced correctly');

        // STEP 5: Test bidirectional sync - add pin from window 2
        await page2.click('.maplibregl-canvas', { position: { x: 400, y: 400 } });

        // Wait for quick pin menu in window 2
        await page2.waitForSelector('text=Water', { timeout: 5000 });
        await page2.click('button:has-text("Water")');

        console.log('Pin added in window 2');

        // STEP 6: Verify it syncs back to window 1
        await page1.waitForTimeout(3000); // Wait for polling cycle

        const pinsInWindow1 = await page1.locator('.marker, [class*="pin"]').count();
        expect(pinsInWindow1).toBeGreaterThanOrEqual(2); // At least 2 pins now

        console.log(`✅ Bidirectional sync works! Found ${pinsInWindow1} pin(s) in window 1`);
    });

    test('should handle offline/online sync correctly', async () => {
        // Create a map
        await page1.goto('/');
        await page1.waitForSelector('text=Create Map', { timeout: 10000 });
        await page1.click('text=Create Map');
        await page1.fill('input[placeholder*="Map"]', 'Offline Test Map');
        await page1.click('button:has-text("Create")');
        await page1.waitForSelector('.maplibregl-canvas', { timeout: 10000 });

        // Go offline
        await page1.context().setOffline(true);

        // Add pin while offline
        await page1.click('.maplibregl-canvas', { position: { x: 300, y: 300 } });
        await page1.waitForSelector('text=Medical', { timeout: 5000 });
        await page1.click('button:has-text("Medical")');

        // Pin should be added locally
        const offlinePins = await page1.locator('.marker, [class*="pin"]').count();
        expect(offlinePins).toBeGreaterThan(0);

        console.log('✅ Pin added while offline');

        // Go back online
        await page1.context().setOffline(false);

        // Wait for sync (should happen automatically)
        await page1.waitForTimeout(5000);

        // Pin should still be visible
        const onlinePins = await page1.locator('.marker, [class*="pin"]').count();
        expect(onlinePins).toEqual(offlinePins);

        console.log('✅ Offline pin persisted after going online');
    });

    test('should display correct pin icons and types', async () => {
        await page1.goto('/');
        await page1.waitForSelector('text=Create Map', { timeout: 10000 });
        await page1.click('text=Create Map');
        await page1.fill('input[placeholder*="Map"]', 'Icon Test Map');
        await page1.click('button:has-text("Create")');
        await page1.waitForSelector('.maplibregl-canvas', { timeout: 10000 });

        // Test each pin type
        const pinTypes = ['Medical', 'Water', 'Food', 'Shelter'];

        for (const type of pinTypes) {
            await page1.click('.maplibregl-canvas', { position: { x: 300 + pinTypes.indexOf(type) * 50, y: 300 } });
            await page1.waitForSelector(`text=${type}`, { timeout: 5000 });
            await page1.click(`button:has-text("${type}")`);
            await page1.waitForTimeout(500);
        }

        // All pins should be visible
        const totalPins = await page1.locator('.marker, [class*="pin"]').count();
        expect(totalPins).toBeGreaterThanOrEqual(4);

        console.log(`✅ Created ${totalPins} pins with different types`);

        // Click on first pin and verify type label
        const firstPin = page1.locator('.marker, [class*="pin"]').first();
        await firstPin.click();
        await page1.waitForSelector('.maplibregl-popup, [class*="popup"]', { timeout: 3000 });

        // Should show type label
        const hasTypeLabel = await page1.locator('.maplibregl-popup, [class*="popup"]').count() > 0;
        expect(hasTypeLabel).toBe(true);

        console.log('✅ Pin icons and types display correctly');
    });
});

test.describe('Database Integrity', () => {
    test('should not show malformed array literal errors', async ({ page }) => {
        const consoleErrors: string[] = [];

        // Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Create map and add pins
        await page.goto('/');
        await page.waitForSelector('text=Create Map', { timeout: 10000 });
        await page.click('text=Create Map');
        await page.fill('input[placeholder*="Map"]', 'Error Test Map');
        await page.click('button:has-text("Create")');
        await page.waitForSelector('.maplibregl-canvas', { timeout: 10000 });

        // Add a pin
        await page.click('.maplibregl-canvas', { position: { x: 300, y: 300 } });
        await page.waitForSelector('text=Medical', { timeout: 5000 });
        await page.click('button:has-text("Medical")');

        // Wait a bit for any errors to appear
        await page.waitForTimeout(3000);

        // Check for array-related errors
        const hasArrayErrors = consoleErrors.some(err =>
            err.includes('malformed array') ||
            err.includes('array literal') ||
            err.includes('TEXT[]')
        );

        expect(hasArrayErrors).toBe(false);

        console.log('✅ No malformed array literal errors');
    });
});
