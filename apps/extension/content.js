// Content script for LinkedIn integration
console.log('[Job Finder Agent] Content script loaded.');

// ============================================================
// SESSION SYNCHRONIZATION FOR LOCALHOST
// ============================================================
const isValidJWT = (str) => typeof str === 'string' && str.startsWith('eyJ') && str.split('.').length === 3;

if (window.location.host.includes('localhost:3000')) {
  // METHOD 1: Listen for postMessage from the dashboard React app (most reliable)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'JF_SESSION_TOKEN' && isValidJWT(event.data.token)) {
      chrome.storage.local.set({ supabaseToken: event.data.token });
      console.log('[Job Finder Agent] ✅ Token synced via postMessage.');
    }
  });

  const syncSession = () => {
    // METHOD 2: Read from DOM element data attribute
    const tokenEl = document.getElementById('jf-supabase-token') || document.getElementById('jf-supabase-token-client');
    if (tokenEl) {
      // Try data-attribute first (always works), then textContent, then innerText
      const token = (tokenEl.getAttribute('data-token') || tokenEl.textContent || tokenEl.innerText || '').trim();
      if (isValidJWT(token)) {
        chrome.storage.local.set({ supabaseToken: token });
        console.log('[Job Finder Agent] ✅ Token synced from DOM attribute.');
        return; // Success — skip localStorage fallback
      }
    }

    // METHOD 3: Scan localStorage for Supabase session keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth-token') || key.includes('supabase.auth.token'))) {
        try {
          const raw = localStorage.getItem(key);
          const sessionData = JSON.parse(raw);
          if (sessionData && isValidJWT(sessionData.access_token)) {
            chrome.storage.local.set({ supabaseToken: sessionData.access_token });
            console.log('[Job Finder Agent] ✅ Token synced from localStorage.');
            return;
          }
        } catch (e) {}
      }
    }

    // METHOD 3b: Supabase v2 stores in sb-*-auth-token with nested currentSession
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        try {
          const raw = localStorage.getItem(key);
          const parsed = JSON.parse(raw);
          const token = parsed?.access_token || parsed?.currentSession?.access_token;
          if (isValidJWT(token)) {
            chrome.storage.local.set({ supabaseToken: token });
            console.log('[Job Finder Agent] ✅ Token synced from Supabase v2 localStorage.');
            return;
          }
        } catch (e) {}
      }
    }
  };

  // Run sync immediately and on DOM changes (debounced)
  syncSession();
  setTimeout(syncSession, 2000); // Retry after React hydration
  setTimeout(syncSession, 5000); // Retry again for slow renders
  
  let syncDebounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(syncSession, 500);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// ============================================================
// INTELLIGENT EASY APPLY BUTTON SELECTOR
// ============================================================
// EASY APPLY BUTTON DETECTOR (LinkedIn Obfuscated CSS Compatible)
// ============================================================
function getEasyApplyButton() {
  // --- TEXT NORMALIZER ---
  function normalizeText(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // --- MULTI-LANGUAGE KEYWORDS ---
  const EASY_APPLY_KEYWORDS = [
    'easy apply', 'easyapply',
    'kolay başvur', 'kolay başvuru',
    'müraciət et', 'asan müraciət',
    'подать заявку', 'простая подача',
    'candidature simplifiée', 'postuler facilement',
    'solicitud sencilla',
    'schnell bewerben',
  ];

  const APPLY_KEYWORDS = ['apply', 'başvur', 'müraciət', 'bewerben', 'postuler', 'подать'];

  // --- BANNED TEXT (Premium/navigation elements to ignore) ---
  const BANNED_TEXT = [
    'premium', 'upgrade', 'try for', 'subscribe',
    'for business', 'messaging', 'notifications',
    'home', 'my network', 'jobs', 'me ', 
    'skip to', 'save', 'share', 'follow', 'dismiss',
    'auto-apply', 'sync results', 'debug'
  ];

  function isBannedText(text) {
    const lower = text.toLowerCase();
    return BANNED_TEXT.some(banned => lower.includes(banned));
  }

  function looksLikeEasyApply(text) {
    const lower = text.toLowerCase();
    return EASY_APPLY_KEYWORDS.some(kw => lower.includes(kw));
  }

  function looksLikeApply(text) {
    const lower = text.toLowerCase();
    return APPLY_KEYWORDS.some(kw => lower.includes(kw));
  }

  // --- BANNED ZONE: Skip nav, header, premium areas ---
  function isInsideBannedZone(el) {
    let node = el;
    while (node && node !== document.body) {
      const tag = node.tagName;
      const role = (node.getAttribute('role') || '').toLowerCase();
      const cls = (node.className || '').toString().toLowerCase();
      const id = (node.id || '').toLowerCase();
      
      // Skip navigation, header, banner elements
      if (tag === 'NAV' || tag === 'HEADER') return true;
      if (role === 'banner' || role === 'navigation') return true;
      if (cls.includes('global-nav') || cls.includes('scaffold-layout__header')) return true;
      if (id.includes('global-nav')) return true;
      
      // Skip our own toolbar
      if (id === 'jf-agent-toolbar') return true;
      
      node = node.parentElement;
    }
    return false;
  }

  // ── STRATEGY 1: Search ALL interactive elements for "Easy Apply" text ──
  // LinkedIn now uses hashed class names, so we search by text/aria only.
  // CRITICAL: The Easy Apply button is NEVER an 'a' tag (hyperlink). Excluding 'a' tags
  // prevents false positives on the job card links in the search results list.
  const interactiveSelectors = 'button, [role="button"], span[tabindex], div[tabindex]';
  const allInteractive = document.querySelectorAll(interactiveSelectors);
  
  for (const el of allInteractive) {
    if (isInsideBannedZone(el)) continue;
    
    const text = normalizeText(el);
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    
    // Check for "Easy Apply" specifically.
    // CRITICAL: A real button has very short text (e.g., "Easy Apply"). 
    if ((looksLikeEasyApply(text) || looksLikeEasyApply(ariaLabel)) &&
        text.length < 30 &&
        !isBannedText(text) && !ariaLabel.includes('premium')) {
      console.log('[Job Finder Agent] ✅ Easy Apply found via text:', text.substring(0, 50));
      return el;
    }
  }

  // ── STRATEGY 2: Search for elements with aria-label specifically containing "easy apply" ──
  const ariaApplyElements = document.querySelectorAll('[aria-label*="easy" i], [aria-label*="Easy" i]');
  for (const el of ariaApplyElements) {
    if (isInsideBannedZone(el)) continue;
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const text = normalizeText(el);
    if (looksLikeEasyApply(ariaLabel) && ariaLabel.length < 40 && text.length < 30 && !isBannedText(ariaLabel)) {
      console.log('[Job Finder Agent] ✅ Easy Apply found via aria-label:', ariaLabel);
      return el;
    }
  }

  // ── STRATEGY 3: Look for LinkedIn's data-test or data-control-* attributes ──
  const dataTestApply = document.querySelector('[data-test-component="easy-apply-button"], [data-control-name="jobdetails_topcard_inapply"]');
  if (dataTestApply && !isInsideBannedZone(dataTestApply)) {
    console.log('[Job Finder Agent] ✅ Easy Apply found via data-test attribute.');
    return dataTestApply;
  }

  // ── STRATEGY 4: Legacy class selectors ──
  const legacySelectors = [
    '.jobs-apply-button',
    'button[class*="jobs-apply"]',
    '.jobs-s-apply button',
    '.jobs-apply-button--top-card'
  ];
  for (const sel of legacySelectors) {
    const el = document.querySelector(sel);
    if (el && !isInsideBannedZone(el)) {
      const text = normalizeText(el);
      if (!isBannedText(text) && looksLikeEasyApply(text)) {
        console.log('[Job Finder Agent] ✅ Easy Apply found via legacy selector:', sel);
        return el;
      }
    }
  }

  console.warn('[Job Finder Agent] ⚠ No Easy Apply button found. This job may require external application.');
  return null;
}

// ============================================================
// CENTRAL API REQUEST WRAPPER WITH BEARER AUTH (Bug 4 Fix)
// ============================================================
async function callAgentApi(path, options = {}) {
  const { serverUrl = 'http://localhost:3000' } = await chrome.storage.local.get('serverUrl');
  const { supabaseToken } = await chrome.storage.local.get('supabaseToken');

  if (!supabaseToken) {
    console.error('[Job Finder Agent] No auth token found. Please open your dashboard first.');
    throw new Error('Not authenticated. Please open your Job Finder Agent dashboard (localhost:3000) and log in.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseToken}`,
    ...(options.headers || {})
  };

  const response = await fetch(`${serverUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    console.error('[Job Finder Agent] Auth token expired or invalid. Please refresh your dashboard.');
    throw new Error('Session expired. Please refresh your Job Finder Agent dashboard to re-authenticate.');
  }

  return response;
}

// ============================================================
// PERIODIC CONTROLLER INJECTION (Bug 11 Fix)
// ============================================================
let lastInjectedUrl = '';
const checkAndInject = () => {
  const currentUrl = window.location.href;
  // Only re-run if URL changed or elements are missing
  if (currentUrl !== lastInjectedUrl || !document.getElementById('job-finder-sync-btn')) {
    lastInjectedUrl = currentUrl;
    
    if (currentUrl.includes('/jobs/')) {
      injectJobSyncButton();
    }
    if (currentUrl.includes('/jobs/search') || currentUrl.includes('/jobs/collections')) {
      injectAgentToolbar();
    }
    if (currentUrl.includes('/messaging/')) {
      injectMessagingAssistant();
    }
  }
};
setInterval(checkAndInject, 2500);

// ============================================================
// 1. JOB DETAILS SCRAPER & SYNC BUTTON
// ============================================================
function injectJobSyncButton() {
  if (document.getElementById('job-finder-sync-btn')) return;

  const actionContainer = 
    document.querySelector('.jobs-apply-button--top-card') || 
    document.querySelector('.jobs-save-button') ||
    document.querySelector('.job-details-jobs-unified-top-card__container');

  if (!actionContainer) return;

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

    try {
      const res = await callAgentApi('/api/applications/create-external', {
        method: 'POST',
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
      console.error('[Job Finder Agent] Error syncing job:', err);
      syncBtn.querySelector('.sync-text').innerText = 'Sync Failed (Click to retry)';
      syncBtn.disabled = false;
      alert(`Sync Failed: ${err.message || 'Please ensure you are logged into your Job Finder Agent dashboard.'}`);
    }
  });

  actionContainer.parentNode.insertBefore(syncBtn, actionContainer.nextSibling);
}

// ============================================================
// 2. MESSAGING ASSISTANT
// ============================================================
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

    const messageBubbles = document.querySelectorAll('.msg-s-event-listitem__body');
    let lastRecruiterMsg = '';
    if (messageBubbles.length > 0) {
      lastRecruiterMsg = messageBubbles[messageBubbles.length - 1].innerText;
    }

    try {
      const resumesRes = await callAgentApi('/api/resume/optimize', { method: 'GET' }).catch(() => null);
      let resumeContent = null;
      if (resumesRes && resumesRes.ok) {
        const resumes = await resumesRes.json();
        if (resumes.length > 0) resumeContent = resumes[0].content;
      }

      const replyRes = await callAgentApi('/api/applications/chat-reply', {
        method: 'POST',
        body: JSON.stringify({ recruiterMessage: lastRecruiterMsg, resumeContent })
      });

      const replyData = await replyRes.json();

      if (replyRes.ok) {
        chatInput.focus();
        // Bug 10 fix: Use InputEvent instead of deprecated execCommand
        const inputEvent = new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: replyData.replyText,
          bubbles: true,
          cancelable: true
        });
        chatInput.dispatchEvent(inputEvent);
        // Fallback: set innerHTML directly if InputEvent doesn't work
        if (!chatInput.innerText.includes(replyData.replyText)) {
          chatInput.innerHTML = `<p>${replyData.replyText}</p>`;
          chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        suggestBtn.innerText = '✦ Suggest AI Reply';
      } else {
        throw new Error(replyData.error || 'Failed to suggest reply');
      }
    } catch (err) {
      console.error('[Job Finder Agent] Error getting AI suggestions:', err);
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

    try {
      const res = await callAgentApi('/api/applications/create-external', {
        method: 'POST',
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
      console.error('[Job Finder Agent] Error syncing chat details:', err);
      syncChatBtn.innerText = '✦ Save Recruiter details';
      syncChatBtn.disabled = false;
      alert(`Sync Failed: ${err.message}`);
    }
  });
}

// ============================================================
// 3. HIGHLIGHT TO TRANSLATE TOOLTIP
// ============================================================
let activeTrigger = null;
let activeTooltip = null;

function removeFloatingElements() {
  if (activeTrigger) {
    activeTrigger.remove();
    activeTrigger = null;
  }
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

document.addEventListener('mouseup', (e) => {
  if (e.target.closest('.jf-floating-translate-trigger') || e.target.closest('.jf-floating-translate-tooltip')) {
    return;
  }

  removeFloatingElements();

  const selection = window.getSelection();
  const selectedText = selection ? selection.toString().trim() : '';

  if (selectedText.length > 2) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const trigger = document.createElement('button');
    trigger.className = 'jf-floating-translate-trigger';
    trigger.innerHTML = '✦ Translate';
    
    trigger.style.top = `${window.scrollY + rect.top - 32}px`;
    trigger.style.left = `${window.scrollX + rect.left + (rect.width / 2) - 40}px`;

    trigger.addEventListener('click', async (event) => {
      event.stopPropagation();
      trigger.innerText = 'Translating...';
      trigger.disabled = true;

      try {
        const res = await callAgentApi('/api/translation/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: selectedText,
            sourceLang: 'auto-detect',
            targetLang: 'Azerbaijani (or English if source is Azerbaijani)'
          })
        });

        if (!res.ok) throw new Error('Translation failed');
        const data = await res.json();

        createTooltip(data.translatedText, rect);
        if (activeTrigger) {
          activeTrigger.remove();
          activeTrigger = null;
        }

      } catch (err) {
        console.error('[Job Finder Agent] Selection translation failed:', err);
        trigger.innerText = 'Error!';
        setTimeout(removeFloatingElements, 2000);
      }
    });

    document.body.appendChild(trigger);
    activeTrigger = trigger;
  }
});

function createTooltip(text, targetRect) {
  removeFloatingElements();

  const tooltip = document.createElement('div');
  tooltip.className = 'jf-floating-translate-tooltip animate-fade-in';
  tooltip.innerHTML = `
    <div class="jf-tooltip-header">
      <span class="jf-tooltip-title">✦ AI Translation</span>
      <button class="jf-tooltip-close">&times;</button>
    </div>
    <div class="jf-tooltip-content">${text}</div>
  `;

  tooltip.style.top = `${window.scrollY + targetRect.top - 110}px`;
  tooltip.style.left = `${window.scrollX + targetRect.left + (targetRect.width / 2) - 130}px`;

  tooltip.querySelector('.jf-tooltip-close').addEventListener('click', (e) => {
    e.stopPropagation();
    removeFloatingElements();
  });

  document.body.appendChild(tooltip);
  activeTooltip = tooltip;
}

// ============================================================
// 4. COGNITIVE FORM EXTRACTOR & AUTO-FILL (Bug 9 Fix)
// ============================================================
let fieldIdCounter = 0;

function extractFormFields(modal) {
  const fields = [];
  
  // 1. Text fields & Textareas
  const textInputs = modal.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="url"], textarea');
  textInputs.forEach(input => {
    // Bug 9 fix: Use stable sequential IDs instead of random ones
    let id = input.getAttribute('data-jf-field-id');
    if (!id) {
      id = input.id || input.name || `field-${++fieldIdCounter}`;
      input.setAttribute('data-jf-field-id', id);
    }

    const labelEl = modal.querySelector(`label[for="${input.id}"]`) || input.closest('.fb-form-element, div')?.querySelector('label, span[class*="label"]');
    const label = labelEl ? labelEl.innerText.trim() : (input.getAttribute('aria-label') || input.placeholder || 'Question');

    fields.push({
      id,
      label,
      type: input.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'text',
      placeholder: input.placeholder || '',
      currentValue: input.value || ''
    });
  });

  // 2. Select Dropdowns
  const selects = modal.querySelectorAll('select');
  selects.forEach(select => {
    let id = select.getAttribute('data-jf-field-id');
    if (!id) {
      id = select.id || select.name || `field-${++fieldIdCounter}`;
      select.setAttribute('data-jf-field-id', id);
    }

    const labelEl = modal.querySelector(`label[for="${select.id}"]`) || select.closest('.fb-form-element, div')?.querySelector('label, span[class*="label"]');
    const label = labelEl ? labelEl.innerText.trim() : (select.getAttribute('aria-label') || 'Selection');

    const options = Array.from(select.options).map(opt => opt.text.trim()).filter(t => t);

    fields.push({
      id,
      label,
      type: 'select',
      options
    });
  });

  // 3. Radio groups
  const radioGroups = {};
  const radios = modal.querySelectorAll('input[type="radio"]');
  radios.forEach(radio => {
    const name = radio.name || 'radio-group';
    if (!radioGroups[name]) radioGroups[name] = [];
    radioGroups[name].push(radio);
  });

  Object.entries(radioGroups).forEach(([name, radioElements]) => {
    const id = `radio-${name}`;
    radioElements.forEach(r => r.setAttribute('data-jf-field-id', id));

    const parentContainer = radioElements[0].closest('fieldset, .fb-form-element, div[class*="group"]');
    const labelEl = parentContainer ? parentContainer.querySelector('legend, span[class*="legend"], span[class*="label"]') : null;
    const label = labelEl ? labelEl.innerText.trim() : `Select option for ${name}`;

    const options = radioElements.map(r => {
      const labelSibling = modal.querySelector(`label[for="${r.id}"]`) || r.nextElementSibling;
      return labelSibling ? labelSibling.innerText.trim() : 'Option';
    });

    fields.push({
      id,
      label,
      type: 'radio',
      options
    });
  });

  return fields;
}

function fillFormFields(modal, answers) {
  Object.entries(answers).forEach(([fieldId, decidedValue]) => {
    const elements = modal.querySelectorAll(`[data-jf-field-id="${fieldId}"]`);
    if (elements.length === 0) return;

    const firstElement = elements[0];
    const type = firstElement.getAttribute('type') || firstElement.tagName.toLowerCase();

    if (type === 'textarea' || type === 'text' || type === 'email' || type === 'tel' || type === 'number' || type === 'url' || firstElement.tagName.toLowerCase() === 'textarea') {
      // Use native setter to bypass React's controlled input
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        firstElement.tagName.toLowerCase() === 'textarea' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, 'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(firstElement, decidedValue);
      } else {
        firstElement.value = decidedValue;
      }
      firstElement.dispatchEvent(new Event('input', { bubbles: true }));
      firstElement.dispatchEvent(new Event('change', { bubbles: true }));
    } 
    else if (firstElement.tagName.toLowerCase() === 'select') {
      const select = firstElement;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].text.trim().toLowerCase() === String(decidedValue).toLowerCase() ||
            select.options[i].value.toLowerCase() === String(decidedValue).toLowerCase()) {
          select.selectedIndex = i;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    } 
    else if (type === 'radio') {
      elements.forEach(radio => {
        const labelSibling = modal.querySelector(`label[for="${radio.id}"]`) || radio.nextElementSibling;
        const optionText = labelSibling ? labelSibling.innerText.trim().toLowerCase() : '';
        if (optionText === String(decidedValue).toLowerCase() || String(decidedValue).toLowerCase().includes(optionText)) {
          radio.click();
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }
  });
}

// ============================================================
// 5. FLOATING CAREER AI AGENT TOOLBAR & AUTO-APPLY
// ============================================================
function injectAgentToolbar() {
  if (document.getElementById('job-finder-agent-toolbar')) return;

  const toolbar = document.createElement('div');
  toolbar.id = 'job-finder-agent-toolbar';
  
  toolbar.innerHTML = `
    <div style="font-size: 11px; font-weight: bold; color: #a78bfa; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
      <span style="font-size: 13px;">✦</span> Career AI Agent Toolbar
    </div>
    <div id="jf-agent-auth" style="font-size: 9px; margin-bottom: 4px; font-family: monospace; padding: 3px 6px; border-radius: 6px; background: #1e293b;">🔑 Auth: checking...</div>
    <div id="jf-agent-status" style="font-size: 10px; color: #94a3b8; margin-bottom: 8px; font-family: monospace;">Status: Ready</div>
    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
      <button id="jf-btn-bulk-sync" style="background: #8b5cf6; border: none; border-radius: 8px; color: white; padding: 8px 12px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.2s; flex: 1;">
        Sync Results
      </button>
      <button id="jf-btn-auto-apply" style="background: #10b981; border: none; border-radius: 8px; color: white; padding: 8px 12px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.2s; flex: 1;">
        Auto-Apply
      </button>
      <button id="jf-btn-debug" style="background: #f59e0b; border: none; border-radius: 8px; color: #000; padding: 6px 10px; font-size: 10px; font-weight: bold; cursor: pointer; transition: all 0.2s; width: 100%; margin-top: 4px;">
        🔍 Debug: Scan Page Buttons
      </button>
    </div>
    <div id="jf-debug-output" style="display: none; margin-top: 8px; max-height: 200px; overflow-y: auto; font-size: 9px; font-family: monospace; color: #94a3b8; background: #020617; border-radius: 8px; padding: 8px; border: 1px solid #1e293b;"></div>
  `;

  Object.assign(toolbar.style, {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    zIndex: '9999',
    backgroundColor: '#0f172a',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '16px',
    padding: '14px',
    width: '280px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });

  document.body.appendChild(toolbar);

  const syncBtn = document.getElementById('jf-btn-bulk-sync');
  const applyBtn = document.getElementById('jf-btn-auto-apply');
  const statusText = document.getElementById('jf-agent-status');
  const authStatus = document.getElementById('jf-agent-auth');
  const debugBtn = document.getElementById('jf-btn-debug');
  const debugOutput = document.getElementById('jf-debug-output');

  // Show auth status and try to fetch token if missing
  async function checkAndSyncAuth() {
    const result = await chrome.storage.local.get(['supabaseToken']);
    if (result.supabaseToken && result.supabaseToken.startsWith('eyJ')) {
      try {
        const payload = JSON.parse(atob(result.supabaseToken.split('.')[1]));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          authStatus.style.color = '#22c55e';
          authStatus.innerHTML = '🔑 <b style="color:#22c55e">✅ Authenticated</b>';
          return;
        }
      } catch (e) {}
    }

    // No valid token — ask background service worker to sync
    authStatus.style.color = '#f59e0b';
    authStatus.innerText = '🔑 Syncing token...';
    
    try {
      const { serverUrl = 'http://localhost:3000' } = await chrome.storage.local.get('serverUrl');
      const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN', serverUrl });
      if (response && response.success && response.token) {
        authStatus.style.color = '#22c55e';
        authStatus.innerHTML = '🔑 <b style="color:#22c55e">✅ Token synced!</b>';
        console.log('[Job Finder Agent] ✅ Token synced via background worker.');
        return;
      }
    } catch (e) {
      console.log('[Job Finder Agent] Background sync failed:', e.message);
    }

    // Still no token
    authStatus.style.color = '#ef4444';
    authStatus.innerHTML = '🔑 <b style="color:#ef4444">❌ Not logged in</b> — Click extension icon → Login';
  }
  checkAndSyncAuth();

  // Debug button: comprehensive page scan
  debugBtn.addEventListener('click', async () => {
    debugOutput.style.display = 'block';
    let report = '<b style="color:#f59e0b">== FULL PAGE DIAGNOSTIC ==</b><br>';
    
    // Page info
    report += `<br><b>URL:</b> ${window.location.href.substring(0, 80)}<br>`;
    report += `<b>Lang:</b> ${document.documentElement.lang || 'unknown'}<br>`;

    // Check job detail panel
    const detailPanel = document.querySelector('.jobs-search__job-details') || 
                        document.querySelector('.jobs-unified-top-card') ||
                        document.querySelector('.job-details-jobs-unified-top-card__container') ||
                        document.querySelector('.jobs-search__job-details--wrapper');
    if (detailPanel) {
      report += `<b style="color:#22c55e">📋 Job detail panel: FOUND</b><br>`;
    } else {
      report += `<b style="color:#ef4444">📋 Job detail panel: NOT FOUND — click a job first!</b><br>`;
    }

    // Check Easy Apply button
    const easyApplyBtn = getEasyApplyButton();
    if (easyApplyBtn) {
      const text = (easyApplyBtn.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 60);
      const cls = (easyApplyBtn.className || '').toString().substring(0, 80);
      const parent = easyApplyBtn.parentElement ? easyApplyBtn.parentElement.className : 'none';
      report += `<br><b style="color:#22c55e">✅ Easy Apply FOUND:</b><br>`;
      report += `  Text: "${text}"<br>`;
      report += `  Class: ${cls}<br>`;
      report += `  Parent: ${parent.toString().substring(0, 60)}<br>`;
    } else {
      report += `<br><b style="color:#ef4444">❌ No Easy Apply button</b><br>`;
    }

    // Show FIRST 15 buttons
    report += '<br><b style="color:#a78bfa">First 15 buttons on page:</b><br>';
    const allBtns = document.querySelectorAll('button');
    for (let i = 0; i < Math.min(15, allBtns.length); i++) {
      const btn = allBtns[i];
      const text = (btn.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 45);
      const cls = (btn.className || '').toString().substring(0, 40);
      const color = text.toLowerCase().includes('apply') ? '#22c55e' : 
                    text.toLowerCase().includes('premium') ? '#ef4444' : '#94a3b8';
      report += `<span style="color:${color}">[${i}]</span> "${text}" <span style="color:#475569">(${cls})</span><br>`;
    }
    report += `<br><b>Total buttons: ${allBtns.length}</b><br>`;

    // Count job links
    const jobLinks = document.querySelectorAll('a[href*="/jobs/view/"]');
    report += `<b>Job links found: ${jobLinks.length}</b><br>`;

    // Check for any elements with 'easy' in class/text
    const easyElements = document.querySelectorAll('[class*="easy"], [aria-label*="Easy"], [aria-label*="easy"]');
    report += `<b>Elements with "easy" in class/aria: ${easyElements.length}</b><br>`;
    easyElements.forEach((el, i) => {
      if (i < 5) {
        report += `  → ${el.tagName} class="${(el.className || '').toString().substring(0, 40)}"<br>`;
      }
    });

    // Auto-click first job and re-scan
    if (!detailPanel && jobLinks.length > 0) {
      report += `<br><b style="color:#f59e0b">⏳ Clicking first job to load detail panel...</b>`;
      debugOutput.innerHTML = report;
      
      jobLinks[0].click();
      await new Promise(r => setTimeout(r, 3000));
      
      report += `<br><br><b style="color:#f59e0b">== RE-SCAN AFTER JOB CLICK ==</b><br>`;
      const newPanel = document.querySelector('.jobs-search__job-details') || 
                       document.querySelector('.jobs-unified-top-card');
      report += `<b>Detail panel: ${newPanel ? '✅ FOUND' : '❌ STILL NOT FOUND'}</b><br>`;
      
      const newBtn = getEasyApplyButton();
      if (newBtn) {
        const text = (newBtn.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 60);
        report += `<b style="color:#22c55e">✅ Easy Apply NOW FOUND: "${text}"</b><br>`;
      } else {
        report += `<b style="color:#ef4444">❌ Still no Easy Apply after click</b><br>`;
        const newBtns = document.querySelectorAll('button');
        report += `<b>Buttons now: ${newBtns.length}</b><br>`;
        for (let i = 0; i < Math.min(10, newBtns.length); i++) {
          const text = (newBtns[i].textContent || '').replace(/\s+/g, ' ').trim().substring(0, 50);
          report += `[${i}] "${text}"<br>`;
        }
      }
    }

    debugOutput.innerHTML = report;
  });

  syncBtn.addEventListener('mouseenter', () => syncBtn.style.backgroundColor = '#7c3aed');
  syncBtn.addEventListener('mouseleave', () => syncBtn.style.backgroundColor = '#8b5cf6');
  applyBtn.addEventListener('mouseenter', () => applyBtn.style.backgroundColor = '#059669');
  applyBtn.addEventListener('mouseleave', () => applyBtn.style.backgroundColor = '#10b981');

  // --- BULK SYNC LISTENER ---
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    statusText.innerText = 'Scraping page...';

    const scrapedJobs = [];
    const jobLinks = document.querySelectorAll('a');
    
    jobLinks.forEach(linkEl => {
      const href = linkEl.getAttribute('href') || '';
      const idMatch = href.match(/\/jobs\/view\/(\d+)/) || href.match(/currentJobId=(\d+)/) || href.match(/\/jobs\/(\d+)/);
      const jobId = idMatch ? idMatch[1] : '';
      
      if (jobId) {
        const title = linkEl.innerText.trim();
        if (!title || title.length < 3) return;
        const lowerTitle = title.toLowerCase();
        if (
          lowerTitle.includes('view') || 
          lowerTitle === 'apply' || 
          lowerTitle === 'easy apply' || 
          lowerTitle === 'save' || 
          lowerTitle === 'dismiss' ||
          lowerTitle.includes('promoted')
        ) return;

        let company = 'Unknown Company';
        let location = 'Unknown Location';
        let parent = linkEl.parentElement;

        for (let i = 0; i < 6; i++) {
          if (!parent) break;
          const compEl = parent.querySelector('.job-card-container__company-name, .job-card-container__primary-description, .job-card-list__company-name, [class*="company-name"], [class*="company"]');
          const locEl = parent.querySelector('.job-card-container__metadata-item, .job-card-container__primary-description + span, .job-card-container__metadata-wrapper, .job-card-list__metadata-item, [class*="location"], [class*="metadata"]');
          
          if (compEl && company === 'Unknown Company') {
            company = compEl.innerText.trim().split('\n')[0].trim();
          }
          if (locEl && location === 'Unknown Location') {
            location = locEl.innerText.trim().split('\n')[0].trim();
          }
          if (company !== 'Unknown Company' && location !== 'Unknown Location') {
            break;
          }
          parent = parent.parentElement;
        }

        const cleanLink = `https://www.linkedin.com/jobs/view/${jobId}/`;

        if (!scrapedJobs.some(j => j.linkedin_job_id === jobId)) {
          scrapedJobs.push({
            linkedin_job_id: jobId,
            title: title,
            company: company,
            location: location,
            link: cleanLink
          });
        }
      }
    });

    if (scrapedJobs.length === 0) {
      statusText.innerText = 'Status: No jobs found on page';
      syncBtn.disabled = false;
      return;
    }

    statusText.innerText = `Status: Syncing ${scrapedJobs.length} jobs...`;

    try {
      const res = await callAgentApi('/api/applications/sync-bulk', {
        method: 'POST',
        body: JSON.stringify({ jobs: scrapedJobs })
      });

      if (res.ok) {
        statusText.innerText = 'Status: Successfully Synced!';
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sync');
      }
    } catch (err) {
      console.error('[Job Finder Agent] Bulk sync error:', err);
      statusText.innerText = `Status: ${err.message || 'Sync Failed'}`;
    } finally {
      syncBtn.disabled = false;
    }
  });

  // --- AUTO-APPLY LISTENER ---
  applyBtn.addEventListener('click', async () => {
    applyBtn.disabled = true;
    syncBtn.disabled = true;
    statusText.innerText = 'Extracting job list...';

    const jobIds = [];
    const links = document.querySelectorAll('a');
    links.forEach(l => {
      const href = l.getAttribute('href') || '';
      const idMatch = href.match(/\/jobs\/view\/(\d+)/) || href.match(/currentJobId=(\d+)/) || href.match(/\/jobs\/(\d+)/);
      if (idMatch && idMatch[1] && !jobIds.includes(idMatch[1])) {
        jobIds.push(idMatch[1]);
      }
    });

    if (jobIds.length === 0) {
      statusText.innerText = 'Status: No jobs found to process';
      applyBtn.disabled = false;
      syncBtn.disabled = false;
      return;
    }

    statusText.innerText = `Status: Auto-applying (0 of ${jobIds.length})...`;
    
    let currentIndex = 0;

    const processNextJob = async () => {
      if (currentIndex >= jobIds.length) {
        statusText.innerText = 'Status: All jobs processed!';
        applyBtn.disabled = false;
        syncBtn.disabled = false;
        return;
      }

      const jobId = jobIds[currentIndex];
      statusText.innerText = `Status: Processing job ${currentIndex + 1}/${jobIds.length}...`;

      // Bug 5 fix: Wrap entire job processing in try/catch
      try {
        // Click job card to load details in the side panel
        const linkEl = document.querySelector(`a[href*="${jobId}"]`);
        if (linkEl) {
          linkEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
          linkEl.click();
        }

        await new Promise(resolve => setTimeout(resolve, 2500));

        // Bug 2 FIX: Only dismiss modals that are ACTUALLY premium/upsell promotions
        const existingModals = document.querySelectorAll('[role="dialog"], .artdeco-modal');
        for (const modal of existingModals) {
          const modalText = (modal.innerText || '').toLowerCase();
          const isPromoModal = 
            modalText.includes('try premium') || 
            modalText.includes('get premium') ||
            modalText.includes('upgrade') ||
            modalText.includes('premium features') ||
            modalText.includes('free trial') ||
            modalText.includes('start my free');
          
          const isEasyApplyModal = 
            modalText.includes('easy apply') ||
            modalText.includes('kolay başvur') ||
            modalText.includes('müraciət') ||
            modal.querySelector('.jobs-easy-apply-content') ||
            modal.querySelector('[class*="easy-apply"]');

          if (isPromoModal && !isEasyApplyModal) {
            console.log('[Job Finder Agent] Dismissing promotional modal.');
            const dismissBtn = 
              modal.querySelector('button[aria-label="Dismiss"]') || 
              modal.querySelector('button[aria-label="Close"]') ||
              modal.querySelector('.artdeco-modal__dismiss');
            if (dismissBtn) {
              dismissBtn.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        // Now find and click the REAL Easy Apply button
        const easyApplyBtn = getEasyApplyButton();

        if (!easyApplyBtn) {
          console.log(`[Job Finder Agent] Job ${jobId} does not have Easy Apply. Skipping.`);
          currentIndex++;
          return processNextJob();
        }

        console.log(`[Job Finder Agent] Clicking Easy Apply for job ${jobId}`);
        easyApplyBtn.click();
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Process the Easy Apply modal form
        let modalOpen = true;
        let stepCounter = 0;
        let formErrorDetected = false;

        while (modalOpen && stepCounter < 15) {
          stepCounter++;
          const modal = document.querySelector('.jobs-easy-apply-modal') || 
                        document.querySelector('[role="dialog"][class*="easy-apply"]') ||
                        document.querySelector('[role="dialog"]');
          
          if (!modal) {
            modalOpen = false;
            break;
          }

          // --- SUCCESS / THANK YOU SCREEN DETECTOR ---
          const modalText = modal.innerText ? modal.innerText.toLowerCase() : '';
          const isSuccessScreen = 
            modalText.includes('application sent') ||
            modalText.includes('application submitted') ||
            modalText.includes('thank you') ||
            modalText.includes('your application was sent') ||
            modalText.includes('successfully applied') ||
            modalText.includes('applied!') ||
            modalText.includes('başvurunuz gönderildi') ||
            modalText.includes('müraciətiniz göndərildi') ||
            modal.querySelector('.artdeco-inline-feedback--success') ||
            modal.querySelector('[class*="post-apply"]');

          if (isSuccessScreen) {
            console.log('[Job Finder Agent] ✅ Success screen detected! Closing modal.');
            const doneBtn = 
              modal.querySelector('button[aria-label*="Dismiss"]') || 
              modal.querySelector('button[aria-label*="Done"]') || 
              modal.querySelector('button[aria-label*="Close"]') || 
              modal.querySelector('.artdeco-modal__dismiss');
            if (doneBtn) {
              doneBtn.click();
            }
            modalOpen = false;
            formErrorDetected = false;
            break;
          }

          // --- DYNAMIC COGNITIVE AI AUTO-FILL ---
          const fields = extractFormFields(modal);
          if (fields.length > 0) {
            statusText.innerText = `Status: AI filling step ${stepCounter}...`;
            
            const jobTitle = (document.querySelector('h1')?.innerText || 'Easy Apply Role').trim();
            const companyName = (document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText || 'LinkedIn Partner').trim();

            const fillRes = await callAgentApi('/api/applications/auto-fill', {
              method: 'POST',
              body: JSON.stringify({ fields, jobTitle, companyName })
            }).catch((err) => {
              console.error('[Job Finder Agent] AI fill error:', err);
              return null;
            });

            if (fillRes && fillRes.ok) {
              const fillData = await fillRes.json();
              if (fillData.answers) {
                fillFormFields(modal, fillData.answers);
                // Wait a moment for LinkedIn to process the inputs
                await new Promise(resolve => setTimeout(resolve, 800));
              }
            }
          }

          // Bug 6 fix: Use JavaScript-based matching for primary button (case-insensitive)
          let primaryBtn = null;
          const modalButtons = modal.querySelectorAll('button');
          for (const btn of modalButtons) {
            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
            const btnText = (btn.innerText || '').toLowerCase().trim();
            
            if (ariaLabel.includes('submit application') || btnText.includes('submit application') ||
                ariaLabel.includes('submit') || btnText === 'submit') {
              primaryBtn = btn;
              break; // Submit takes highest priority
            }
            if (ariaLabel.includes('review') || btnText === 'review') {
              primaryBtn = btn;
              break;
            }
            if (ariaLabel.includes('next') || ariaLabel.includes('continue') || 
                btnText === 'next' || btnText === 'continue' || btnText === 'ileri' || btnText === 'növbəti') {
              primaryBtn = btn;
              // Don't break — keep looking for Submit/Review which have higher priority
            }
          }

          if (primaryBtn) {
            console.log(`[Job Finder Agent] Clicking: ${primaryBtn.innerText.trim()}`);
            primaryBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2500));
          } else {
            console.warn('[Job Finder Agent] No navigation button found in modal. Stopping.');
            formErrorDetected = true;
            break;
          }

          // Check if modal is still open
          const modalStillExists = document.querySelector('.jobs-easy-apply-modal') || document.querySelector('[role="dialog"]');
          if (!modalStillExists) {
            modalOpen = false;
            break;
          }

          // Check for validation errors
          const hasError = modal.querySelector('.artdeco-inline-feedback--error, [aria-invalid="true"], .fb-form-element__feedback');
          if (hasError) {
            formErrorDetected = true;
            statusText.innerText = 'Status: Paused (Manual Input Required)';
            hasError.scrollIntoView({ block: 'center', behavior: 'smooth' });
            console.warn('[Job Finder Agent] Form validation error detected. Pausing.');
            break;
          }
        }

        // Bug 7 fix: Remove existing resume button before adding a new one
        if (formErrorDetected) {
          const existingResumeBtn = document.getElementById('jf-btn-resume-apply');
          if (existingResumeBtn) existingResumeBtn.remove();

          const resumeBtn = document.createElement('button');
          resumeBtn.id = 'jf-btn-resume-apply';
          resumeBtn.innerText = 'Resume Auto-Apply';
          Object.assign(resumeBtn.style, {
            backgroundColor: '#8b5cf6',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '6px',
            width: '100%'
          });

          toolbar.appendChild(resumeBtn);

          resumeBtn.addEventListener('click', () => {
            resumeBtn.remove();
            currentIndex++;
            processNextJob();
          });
        } else {
          // Sync the successfully applied job to the dashboard
          const jobTitle = (document.querySelector('h1')?.innerText || 'Easy Apply Role').trim();
          const companyName = (document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText || 'LinkedIn Partner').trim();

          await callAgentApi('/api/applications/create-external', {
            method: 'POST',
            body: JSON.stringify({
              companyName,
              jobTitle,
              jobLink: `https://www.linkedin.com/jobs/view/${jobId}/`,
              status: 'applied',
              notes: 'Submitted automatically by AI Auto-Apply Agent.'
            })
          }).catch(err => console.error('[Job Finder Agent] Failed to sync applied job:', err));

          console.log(`[Job Finder Agent] ✅ Job ${jobId} applied and synced.`);
          currentIndex++;
          await processNextJob();
        }
      } catch (err) {
        // Bug 5 fix: Catch any unhandled error and continue to next job
        console.error(`[Job Finder Agent] Error processing job ${jobId}:`, err);
        statusText.innerText = `Status: Error on job ${currentIndex + 1}, continuing...`;
        currentIndex++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        await processNextJob();
      }
    };

    processNextJob();
  });
}
