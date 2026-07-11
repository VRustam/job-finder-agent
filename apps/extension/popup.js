// Fetch saved server URL and check connection status
document.addEventListener('DOMContentLoaded', async () => {
  const serverInput = document.getElementById('server-url');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const authStatusEl = document.getElementById('auth-status');
  const loginBtn = document.getElementById('login-btn');

  // Load saved server URL
  const { serverUrl = 'http://localhost:3000' } = await chrome.storage.local.get('serverUrl');
  serverInput.value = serverUrl;

  // ============================================================
  // AUTH TOKEN SYNC — 3 methods
  // ============================================================
  async function syncAuthToken() {
    // METHOD 1: Read Supabase auth cookie from localhost:3000
    // Supabase SSR stores the session as a cookie named sb-<ref>-auth-token
    try {
      const allCookies = await chrome.cookies.getAll({ url: serverUrl });
      for (const cookie of allCookies) {
        if (cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')) {
          // Supabase SSR cookie value is a base64-encoded JSON array of chunks
          // or a direct JSON string with the session
          let tokenValue = cookie.value;
          
          // Try to decode and parse
          try {
            // Sometimes the cookie is URL-encoded
            tokenValue = decodeURIComponent(tokenValue);
          } catch (e) {}

          try {
            const parsed = JSON.parse(tokenValue);
            const accessToken = parsed.access_token || (parsed[0] && parsed[0].access_token);
            if (accessToken && accessToken.startsWith('eyJ')) {
              await chrome.storage.local.set({ supabaseToken: accessToken });
              console.log('[Job Finder Agent] ✅ Token synced from Supabase auth cookie!');
              updateAuthUI(true, accessToken);
              return true;
            }
          } catch (e) {
            // Cookie might be chunked — Supabase v2 splits large cookies
            // Look for sb-*-auth-token.0, sb-*-auth-token.1, etc.
          }
        }
      }

      // METHOD 1b: Handle chunked cookies (sb-xxx-auth-token.0, sb-xxx-auth-token.1, ...)
      const chunkCookies = allCookies
        .filter(c => c.name.startsWith('sb-') && c.name.includes('auth-token.'))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      if (chunkCookies.length > 0) {
        let combined = '';
        for (const chunk of chunkCookies) {
          try {
            combined += decodeURIComponent(chunk.value);
          } catch (e) {
            combined += chunk.value;
          }
        }
        try {
          // Supabase encodes as base64url
          let decoded = combined;
          try {
            decoded = atob(combined.replace(/-/g, '+').replace(/_/g, '/'));
          } catch (e) {
            // Might already be plain JSON
          }
          const parsed = JSON.parse(decoded);
          const accessToken = parsed.access_token;
          if (accessToken && accessToken.startsWith('eyJ')) {
            await chrome.storage.local.set({ supabaseToken: accessToken });
            console.log('[Job Finder Agent] ✅ Token synced from chunked Supabase auth cookies!');
            updateAuthUI(true, accessToken);
            return true;
          }
        } catch (e) {
          console.log('[Job Finder Agent] Could not parse chunked auth cookies:', e.message);
        }
      }
    } catch (err) {
      console.log('[Job Finder Agent] Cookie read failed:', err.message);
    }

    // METHOD 2: Check if we already have a token in storage
    const { supabaseToken } = await chrome.storage.local.get('supabaseToken');
    if (supabaseToken && supabaseToken.startsWith('eyJ')) {
      // Verify it's not expired by checking exp claim
      try {
        const payload = JSON.parse(atob(supabaseToken.split('.')[1]));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          updateAuthUI(true, supabaseToken);
          return true;
        }
      } catch (e) {}
    }

    // METHOD 3: Try fetching a session token from the dashboard API
    try {
      const res = await fetch(`${serverUrl}/api/agent/credentials`, {
        method: 'GET',
        credentials: 'include' // Send cookies
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token && data.token.startsWith('eyJ')) {
          await chrome.storage.local.set({ supabaseToken: data.token });
          updateAuthUI(true, data.token);
          return true;
        }
      }
    } catch (e) {}

    updateAuthUI(false);
    return false;
  }

  function updateAuthUI(authenticated, token = '') {
    if (authenticated) {
      authStatusEl.innerHTML = '🔑 <span style="color:#22c55e">Authenticated</span>';
      loginBtn.innerText = '↻ Refresh Token';
    } else {
      authStatusEl.innerHTML = '🔑 <span style="color:#ef4444">Not logged in</span>';
      loginBtn.innerText = '🔗 Open Dashboard & Login';
    }
  }

  // Login button — opens dashboard for user to log in
  loginBtn.addEventListener('click', async () => {
    // Open dashboard page — the content script there will capture the token
    chrome.tabs.create({ url: `${serverUrl}/dashboard` });
    // Re-check in a few seconds
    loginBtn.innerText = 'Syncing...';
    setTimeout(async () => {
      await syncAuthToken();
    }, 3000);
  });

  // ============================================================
  // CONNECTION CHECK
  // ============================================================
  const checkConnection = async (url) => {
    statusDot.className = 'status-dot';
    statusText.innerText = 'Checking...';

    try {
      const res = await fetch(`${url}/api/applications/create-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (res.status === 401) {
        statusDot.className = 'status-dot connected';
        statusText.innerText = 'Server Online (Need Login)';
      } else {
        statusDot.className = 'status-dot connected';
        statusText.innerText = 'Connected';
      }
    } catch (err) {
      statusDot.className = 'status-dot';
      statusText.innerText = 'Server Offline';
    }
  };

  // Run initial checks
  await checkConnection(serverUrl);
  await syncAuthToken();

  // Automatically read and sync the LinkedIn 'li_at' session cookie
  chrome.cookies.get({ url: 'https://www.linkedin.com', name: 'li_at' }, async (cookie) => {
    if (cookie && cookie.value) {
      await chrome.storage.local.set({ linkedinLiAt: cookie.value });
      console.log('[Job Finder Sync] LinkedIn session cookie synced in storage.');

      const { supabaseToken } = await chrome.storage.local.get('supabaseToken');
      if (supabaseToken) {
        fetch(`${serverUrl}/api/agent/credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseToken}`
          },
          body: JSON.stringify({ liAtCookie: cookie.value })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log('[Job Finder Sync] Session cookie synced to server!');
          }
        })
        .catch(err => console.error('Failed to sync session cookie to server:', err));
      }
    }
  });

  // Re-check when URL changes
  serverInput.addEventListener('change', async (e) => {
    const newUrl = e.target.value.trim().replace(/\/$/, '');
    await chrome.storage.local.set({ serverUrl: newUrl });
    await checkConnection(newUrl);
    await syncAuthToken();
  });
});
