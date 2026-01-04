// client/src/main.ts
import App from './App.svelte';
// import { initMonitoring } from './lib/monitoring';

// Initialize monitoring (Sentry + Analytics)
// Disabled until Sentry is configured
// initMonitoring();

console.log('🚀 Mobile Fix Version: 2026-01-04 00:23');
console.log('📱 Checking mobile responsiveness...');

const app = new App({
  target: document.getElementById('app')!,  // or document.body
  props: {
    // any props you want to pass
  }
});

export default app;
