// client/src/main.ts
import './app.css'
import 'uno.css' // UnoCSS styles
import App from './App.svelte';
import { initMonitoring } from './lib/monitoring'

// Initialize monitoring (Sentry + Analytics)
initMonitoring();

const app = new App({
  target: document.getElementById('app')!,  // or document.body
  props: {
    // any props you want to pass
  }
});

export default app;
