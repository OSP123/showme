// client/src/main.ts
import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')!,  // or document.body
  props: {
    // any props you want to pass
  }
});

export default app;
