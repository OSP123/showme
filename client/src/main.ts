// client/src/main.ts
import App from './App.svelte';
// import { initMonitoring } from './lib/monitoring';

// Initialize monitoring (Sentry + Analytics)
// Disabled until Sentry is configured
// initMonitoring();

const app = new App({
  target: document.getElementById('app')!,  // or document.body
  props: {
    // any props you want to pass
  }
});

export default app;
