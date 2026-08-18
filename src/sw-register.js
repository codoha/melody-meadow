// Register the service worker for offline play. Loaded as a classic script (not module)
// so that registration runs before the app module finishes importing.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=0.15.0').catch(() => {
      // Registration failure is non-fatal — the game still works online.
    });
  });
}
