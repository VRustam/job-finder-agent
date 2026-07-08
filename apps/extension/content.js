// Content script for LinkedIn integration
console.log('[Job Finder Sync] Loaded extension content script');

// Inject and check for job listings periodically
setInterval(() => {
  if (window.location.href.includes('/jobs/')) {
    injectJobSyncButton();
  }
  if (window.location.href.includes('/messaging/')) {
    injectMessagingAssistant();
  }
}, 2000);

// --- 1. JOB DETAILS SCRAPER & INJECTOR ---
function injectJobSyncButton() {
  // Avoid duplicate injection
  if (document.getElementById('job-finder-sync-btn')) return;

  // Try to find the top card actions container or Apply button container
  const actionContainer = 
    document.querySelector('.jobs-apply-button--top-card') || 
    document.querySelector('.jobs-save-button') ||
    document.querySelector('.job-details-jobs-unified-top-card__container');

  if (!actionContainer) return;

  // Create Sync Button
  const syncBtn = document.createElement('button');
  syncBtn.id = 'job-finder-sync-btn';
  syncBtn.innerHTML = `
    <span class="sync-icon">✦</span>
    <span class="sync-text">Sync to Job Finder</span>
  `;
  syncBtn.className = 'job-finder-sync-action-button';

  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncBtn.querySelector('.sync-text').innerText = 'Syncing...';

    // Scrape details
    const jobTitle = (
      document.querySelector('.job-details-jobs-unified-top-card__job-title')?.innerText || 
      document.querySelector('h1')?.innerText || 
      'Unknown Role'
    ).trim();

    const companyName = (
      document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText || 
      document.querySelector('.jobs-unified-top-card__company-name')?.innerText ||
      'Unknown Company'
    ).trim();

    const jobLink = window.location.href;

    const { serverUrl = 'http://localhost:3000' } = await chrome.storage.local.get('serverUrl');

    try {
      const res = await fetch(`${serverUrl}/api/applications/create-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          jobTitle,
          jobLink,
          status: 'applied',
          notes: 'Synced from LinkedIn Job Details Page.'
        })
      });

      const data = await res.json();

      if (res.ok) {
        syncBtn.querySelector('.sync-text').innerText = 'Synced Successfully!';
        syncBtn.style.background = '#22c55e';
      } else {
        throw new Error(data.error || 'Failed to sync');
      }
    } catch (err) {
      console.error('[Job Finder Sync] Error syncing job:', err);
      syncBtn.querySelector('.sync-text').innerText = 'Sync Failed (Click to retry)';
      syncBtn.disabled = false;
      alert(`Sync Failed: ${err.message || 'Please ensure you are logged into your Job Finder Agent dashboard.'}`);
    }
  });

  // Insert next to the target element
  actionContainer.parentNode.insertBefore(syncBtn, actionContainer.nextSibling);
}

// --- 2. MESSAGING ASSISTANT ---
function injectMessagingAssistant() {
  if (document.getElementById('job-finder-messaging-panel')) return;

  const chatContainer = document.querySelector('.msg-form__left-actions');
  const chatInput = document.querySelector('.msg-form__contenteditable');

  if (!chatContainer || !chatInput) return;

  const assistantPanel = document.createElement('div');
  assistantPanel.id = 'job-finder-messaging-panel';
  assistantPanel.className = 'job-finder-messaging-panel';
  
  assistantPanel.innerHTML = `
    <button type="button" class="job-finder-action-pill" id="jf-btn-suggest">
      ✦ Suggest AI Reply
    </button>
    <button type="button" class="job-finder-action-pill" id="jf-btn-sync-chat">
      ✦ Save Recruiter details
    </button>
  `;

  chatContainer.parentNode.insertBefore(assistantPanel, chatContainer);

  // Suggest AI Reply listener
  document.getElementById('jf-btn-suggest').addEventListener('click', async () => {
    const suggestBtn = document.getElementById('jf-btn-suggest');
    suggestBtn.innerText = 'Drafting...';
    suggestBtn.disabled = true;

    // Get last recruiter message content
    const messageBubbles = document.querySelectorAll('.msg-s-event-listitem__body');
    let lastRecruiterMsg = '';
    if (messageBubbles.length > 0) {
      lastRecruiterMsg = messageBubbles[messageBubbles.length - 1].innerText;
    }

    const { serverUrl = 'http://localhost:3000' } = await chrome.storage.local.get('serverUrl');

    try {
      // 1. Fetch user's latest resume to use as context
      const resumesRes = await fetch(`${serverUrl}/api/resume/optimize`, { method: 'GET' }).catch(() => null);
      let resumeContent = null;
      if (resumesRes && resumesRes.ok) {
        const resumes = await resumesRes.json();
        if (resumes.length > 0) resumeContent = resumes[0].content;
      }

      // 2. Call the chat-reply generator API
      const replyRes = await fetch(`${serverUrl}/api/applications/chat-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterMessage: lastRecruiterMsg, resumeContent })
      });

      const replyData = await replyRes.json();

      if (replyRes.ok) {
        // LinkedIn message input requires triggering input events to enable the Send button
        chatInput.focus();
        document.execCommand('insertText', false, replyData.replyText);
        suggestBtn.innerText = '✦ Suggest AI Reply';
      } else {
        throw new Error(replyData.error || 'Failed to suggest reply');
      }
    } catch (err) {
      console.error('[Job Finder Sync] Error getting AI suggestions:', err);
      suggestBtn.innerText = '✦ Suggest AI Reply';
      alert(`AI Reply failed: ${err.message || 'Please log in to your Job Finder Agent dashboard.'}`);
    } finally {
      suggestBtn.disabled = false;
    }
  });

  // Sync recruiter details listener
  document.getElementById('jf-btn-sync-chat').addEventListener('click', async () => {
    const syncChatBtn = document.getElementById('jf-btn-sync-chat');
    syncChatBtn.innerText = 'Syncing...';
    syncChatBtn.disabled = true;

    // Extract recruiter name from messaging thread title
    const recruiterName = (
      document.querySelector('.msg-thread__link h2')?.innerText || 
      document.querySelector('.msg-entity-lockup__entity-title')?.innerText ||
      'Recruiter'
    ).trim();

    const companyGuess = prompt(`Enter company name for ${recruiterName}:`, '');
    if (!companyGuess) {
      syncChatBtn.innerText = '✦ Save Recruiter details';
      syncChatBtn.disabled = false;
      return;
    }

    const roleGuess = prompt(`Enter job title (e.g. Frontend Engineer):`, '');
    if (!roleGuess) {
      syncChatBtn.innerText = '✦ Save Recruiter details';
      syncChatBtn.disabled = false;
      return;
    }

    const { serverUrl = 'http://localhost:3000' } = await chrome.storage.local.get('serverUrl');

    try {
      const res = await fetch(`${serverUrl}/api/applications/create-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyGuess,
          jobTitle: roleGuess,
          status: 'interviewing',
          notes: `Recruiter Name: ${recruiterName}\nSynced from LinkedIn messaging thread.`
        })
      });

      if (res.ok) {
        syncChatBtn.innerText = 'Saved!';
        setTimeout(() => {
          syncChatBtn.innerText = '✦ Save Recruiter details';
          syncChatBtn.disabled = false;
        }, 2000);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sync');
      }
    } catch (err) {
      console.error('[Job Finder Sync] Error syncing chat details:', err);
      syncChatBtn.innerText = '✦ Save Recruiter details';
      syncChatBtn.disabled = false;
      alert(`Sync Failed: ${err.message}`);
    }
  });
}
