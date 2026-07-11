// Background service worker for Job Finder Agent extension
// Handles token sync between dashboard (localhost) and content scripts (LinkedIn)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    handleGetAuthToken(message.serverUrl).then(sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'SAVE_AUTH_TOKEN') {
    chrome.storage.local.set({ supabaseToken: message.token });
    sendResponse({ success: true });
    return false;
  }
});

async function handleGetAuthToken(serverUrl = 'http://localhost:3000') {
  // First check if we already have a valid token
  const stored = await chrome.storage.local.get('supabaseToken');
  if (stored.supabaseToken && stored.supabaseToken.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(stored.supabaseToken.split('.')[1]));
      if (payload.exp && payload.exp * 1000 > Date.now()) {
        return { success: true, token: stored.supabaseToken };
      }
    } catch (e) {}
  }

  // Try to get token from dashboard API using cookies
  try {
    const res = await fetch(`${serverUrl}/api/agent/credentials`, {
      method: 'GET',
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token && data.token.startsWith('eyJ')) {
        await chrome.storage.local.set({ supabaseToken: data.token });
        return { success: true, token: data.token };
      }
    }
  } catch (e) {
    console.log('[Background] API fetch failed:', e.message);
  }

  // Try reading Supabase auth cookies directly
  try {
    const cookies = await chrome.cookies.getAll({ url: serverUrl });
    for (const cookie of cookies) {
      if (cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')) {
        try {
          const decoded = decodeURIComponent(cookie.value);
          const parsed = JSON.parse(decoded);
          const token = parsed.access_token;
          if (token && token.startsWith('eyJ')) {
            await chrome.storage.local.set({ supabaseToken: token });
            return { success: true, token };
          }
        } catch (e) {}
      }
    }

    // Handle chunked cookies
    const chunks = cookies
      .filter(c => c.name.startsWith('sb-') && c.name.includes('auth-token.'))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    if (chunks.length > 0) {
      let combined = '';
      for (const chunk of chunks) {
        try { combined += decodeURIComponent(chunk.value); } catch (e) { combined += chunk.value; }
      }
      try {
        const parsed = JSON.parse(combined);
        const token = parsed.access_token;
        if (token && token.startsWith('eyJ')) {
          await chrome.storage.local.set({ supabaseToken: token });
          return { success: true, token };
        }
      } catch (e) {
        // Try base64 decode
        try {
          const decoded = atob(combined.replace(/-/g, '+').replace(/_/g, '/'));
          const parsed = JSON.parse(decoded);
          const token = parsed.access_token;
          if (token && token.startsWith('eyJ')) {
            await chrome.storage.local.set({ supabaseToken: token });
            return { success: true, token };
          }
        } catch (e2) {}
      }
    }
  } catch (e) {
    console.log('[Background] Cookie read failed:', e.message);
  }

  return { success: false, error: 'No token found' };
}
