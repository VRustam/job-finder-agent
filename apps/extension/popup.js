// Fetch saved server URL and check connection status
document.addEventListener('DOMContentLoaded', async () => {
  const serverInput = document.getElementById('server-url');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  // Load saved server URL
  const { serverUrl = 'http://localhost:3000' } = await chrome.storage.local.get('serverUrl');
  serverInput.value = serverUrl;

  const checkConnection = async (url) => {
    statusDot.className = 'status-dot';
    statusText.innerText = 'Checking...';

    try {
      // Fetch the create-external endpoint. It will return 401 or 400 if server is live,
      // or throw a network error if offline.
      const res = await fetch(`${url}/api/applications/create-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // empty payload to trigger standard route handling
      });

      if (res.status === 401) {
        statusDot.className = 'status-dot'; // keep red
        statusText.innerText = 'Not Logged In';
      } else {
        statusDot.className = 'status-dot connected';
        statusText.innerText = 'Connected';
      }
    } catch (err) {
      statusDot.className = 'status-dot';
      statusText.innerText = 'Server Offline';
    }
  };

  // Run initial check
  await checkConnection(serverUrl);

  // Re-check when URL changes
  serverInput.addEventListener('change', async (e) => {
    const newUrl = e.target.value.trim().replace(/\/$/, '');
    await chrome.storage.local.set({ serverUrl: newUrl });
    await checkConnection(newUrl);
  });
});
