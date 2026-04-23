// ==UserScript==
// @name         YouTube Chat Quick Messages
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds configurable quick-send buttons below YouTube live chat
// @author       vlfr1997 (https://github.com/vlfr1997)
// @match        https://www.youtube.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  //  DEFAULT buttons (only used on first install)
  //  After that, buttons are saved in GM storage.
  // ─────────────────────────────────────────────
  const DEFAULT_BUTTONS = [
    { name: "👋 Hello",  text: "Hello everyone! 👋" },
    { name: "❤️ Love",   text: "This is amazing! ❤️" },
    { name: "😂 Haha",   text: "hahaha 😂😂😂" },
    { name: "🔥 Fire",   text: "LET'S GOOO 🔥🔥🔥" },
    { name: "👏 GG",     text: "GG! Well played 👏" },
  ];

  const STORAGE_KEY = 'ytqb_buttons';
  const PANEL_ID    = 'yt-qb-panel';
  const TOGGLE_ID   = 'yt-qb-toggle';
  const SETTINGS_ID = 'yt-qb-settings-modal';

  /* ── Persistent config via GM storage ── */
  function loadConfig() {
    const saved = GM_getValue(STORAGE_KEY, null);
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return DEFAULT_BUTTONS;
  }

  function saveConfig(buttons) {
    GM_setValue(STORAGE_KEY, JSON.stringify(buttons));
  }

  /* ── Inject global styles (once) ── */
  function injectStyles() {
    if (document.getElementById('yt-qb-styles')) return;
    const style = document.createElement('style');
    style.id = 'yt-qb-styles';
    style.textContent = `
      #yt-qb-row {
        display: flex;
        align-items: center;
        gap: 4px;
        margin: 6px 8px 0;
      }
      #${TOGGLE_ID} {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        background: #ff0000;
        color: #fff;
        font-family: 'YouTube Sans', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .4px;
        text-transform: uppercase;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        flex: 1;
        transition: background .15s, transform .1s;
      }
      #${TOGGLE_ID}:hover  { background: #cc0000; }
      #${TOGGLE_ID}:active { transform: scale(.97); }

      #yt-qb-settings-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5px 7px;
        background: var(--yt-spec-badge-chip-background, #272727);
        color: var(--yt-spec-text-primary, #fff);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        flex-shrink: 0;
        transition: background .15s;
      }
      #yt-qb-settings-btn:hover { background: var(--yt-spec-10-percent-layer, #3f3f3f); }

      #${PANEL_ID} {
        display: none;
        flex-wrap: wrap;
        gap: 5px;
        padding: 7px 8px 8px;
        background: var(--yt-spec-base-background, #0f0f0f);
        border-top: 1px solid var(--yt-spec-10-percent-layer, #272727);
        animation: ytQbFadeIn .15s ease;
      }
      #${PANEL_ID}.open { display: flex; }
      #yt-qb-row { margin-bottom: 6px; }
      @keyframes ytQbFadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .yt-qb-btn {
        padding: 4px 10px;
        background: var(--yt-spec-badge-chip-background, #272727);
        color: var(--yt-spec-text-primary, #fff);
        font-family: 'YouTube Sans', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid transparent;
        border-radius: 20px;
        cursor: pointer;
        white-space: nowrap;
        user-select: none;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: background .15s, border-color .15s, transform .1s;
      }
      .yt-qb-btn:hover { background: var(--yt-spec-10-percent-layer, #3f3f3f); border-color: #ff0000; }
      .yt-qb-btn:active { transform: scale(.95); }
      .yt-qb-btn.holding {
        background: #1a3a5c;
        border-color: #4a9eff;
        animation: ytQbPulse .33s ease infinite;
      }
      .yt-qb-btn.sent { background: #1a5c1a; border-color: #2ea82e; }
      @keyframes ytQbPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(74,158,255,.4); }
        50%       { box-shadow: 0 0 0 5px rgba(74,158,255,0); }
      }

      /* Settings modal */
      #${SETTINGS_ID} {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.75);
        z-index: 999999;
        align-items: center;
        justify-content: center;
      }
      #${SETTINGS_ID}.open { display: flex; }

      #yt-qb-modal-box {
        background: #212121;
        color: #fff;
        border-radius: 10px;
        padding: 24px;
        width: 480px;
        max-width: 94vw;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        gap: 16px;
        font-family: 'YouTube Sans', Roboto, sans-serif;
        box-shadow: 0 8px 32px rgba(0,0,0,.6);
      }
      #yt-qb-modal-box h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #yt-qb-modal-box h2 span { flex: 1; }

      #yt-qb-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        max-height: 340px;
        padding-right: 4px;
      }
      #yt-qb-list::-webkit-scrollbar { width: 6px; }
      #yt-qb-list::-webkit-scrollbar-track { background: #333; border-radius: 3px; }
      #yt-qb-list::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }

      .yt-qb-row {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #2a2a2a;
        border-radius: 6px;
        padding: 8px 10px;
      }
      .yt-qb-row-inputs { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }

      .yt-qb-input {
        background: #333;
        border: 1px solid #444;
        border-radius: 4px;
        color: #fff;
        font-family: inherit;
        font-size: 12px;
        padding: 4px 8px;
        width: 100%;
        box-sizing: border-box;
        outline: none;
        transition: border-color .15s;
      }
      .yt-qb-input:focus { border-color: #ff0000; }
      .yt-qb-input::placeholder { color: #666; }

      .yt-qb-icon-btn {
        background: none;
        border: none;
        color: #aaa;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        flex-shrink: 0;
        transition: color .15s, background .15s;
      }
      .yt-qb-icon-btn:hover { color: #fff; background: #444; }
      .yt-qb-icon-btn.delete:hover { color: #ff4444; background: #3a1a1a; }

      #yt-qb-modal-footer {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .yt-qb-action-btn {
        padding: 7px 16px;
        border: none;
        border-radius: 5px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background .15s, transform .1s;
      }
      .yt-qb-action-btn:active { transform: scale(.97); }
      .yt-qb-action-btn.primary   { background: #ff0000; color: #fff; }
      .yt-qb-action-btn.primary:hover { background: #cc0000; }
      .yt-qb-action-btn.secondary { background: #333; color: #fff; }
      .yt-qb-action-btn.secondary:hover { background: #444; }
      .yt-qb-action-btn.add       { background: #1a4a1a; color: #7fff7f; }
      .yt-qb-action-btn.add:hover { background: #215221; }
    `;
    document.head.appendChild(style);
  }

  /* ── CSP-safe SVG builder ── */
  function makeSVG(pathD, width, height, extraAttrs = {}) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    Object.entries(extraAttrs).forEach(([k, v]) => svg.setAttribute(k, v));
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', pathD);
    svg.appendChild(path);
    return svg;
  }

  /* ── Hold-to-spam: fires at 3 msg/s while pointer is held down ── */
  function attachHoldToSend(btn, getText, name) {
    const INTERVAL_MS = 333;
    let timer = null;

    function startSending() {
      if (timer) return;
      sendChatMessage(getText(), btn, name);
      timer = setInterval(() => sendChatMessage(getText(), btn, name), INTERVAL_MS);
      btn.classList.add('holding');
    }
    function stopSending() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      btn.classList.remove('holding');
    }

    btn.addEventListener('mousedown',   e => { e.preventDefault(); startSending(); });
    btn.addEventListener('mouseup',     stopSending);
    btn.addEventListener('mouseleave',  stopSending);
    btn.addEventListener('touchstart',  e => { e.preventDefault(); startSending(); }, { passive: false });
    btn.addEventListener('touchend',    stopSending);
    btn.addEventListener('touchcancel', stopSending);
  }

  /* ── Render quick buttons into the panel ── */
  function renderPanelButtons(panel, config) {
    panel.replaceChildren();
    config.forEach(({ name, text }) => {
      const btn = document.createElement('button');
      btn.className = 'yt-qb-btn';
      btn.textContent = name;
      btn.title = text;
      attachHoldToSend(btn, () => {
        const current = loadConfig().find(b => b.name === name);
        return current ? current.text : text;
      }, name);
      panel.appendChild(btn);
    });
  }

  /* ── Refresh panel after saving ── */
  function refreshPanel() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) renderPanelButtons(panel, loadConfig());
  }

  /* ── Build the main UI (toggle row + panel) ── */
  function buildUI(config) {
    const row = document.createElement('div');
    row.id = 'yt-qb-row';

    const toggle = document.createElement('button');
    toggle.id = TOGGLE_ID;
    toggle.appendChild(makeSVG(
      'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z', 14, 14
    ));
    const label = document.createElement('span');
    label.textContent = 'Quick Buttons';
    toggle.appendChild(label);
    const arrow = makeSVG('M7 10l5 5 5-5z', 12, 12, { id: 'yt-qb-arrow' });
    arrow.style.cssText = 'margin-left:auto;transition:transform .2s';
    toggle.appendChild(arrow);

    const gearBtn = document.createElement('button');
    gearBtn.id = 'yt-qb-settings-btn';
    gearBtn.title = 'Configure quick buttons';
    gearBtn.appendChild(makeSVG(
      'M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z',
      16, 16
    ));
    gearBtn.addEventListener('click', openSettings);

    row.appendChild(toggle);
    row.appendChild(gearBtn);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    renderPanelButtons(panel, config);

    toggle.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      document.getElementById('yt-qb-arrow').style.transform = open ? 'rotate(180deg)' : '';
    });

    return { row, panel };
  }

  /* ── Settings modal ── */
  function openSettings() {
    document.getElementById(SETTINGS_ID)?.remove();

    const config = loadConfig();
    const rows = config.map(b => ({ ...b }));

    const modal = document.createElement('div');
    modal.id = SETTINGS_ID;

    const box = document.createElement('div');
    box.id = 'yt-qb-modal-box';

    // Header
    const h2 = document.createElement('h2');
    const titleSpan = document.createElement('span');
    titleSpan.textContent = '⚡ Quick Buttons Settings';
    h2.appendChild(titleSpan);
    const closeX = document.createElement('button');
    closeX.className = 'yt-qb-icon-btn';
    closeX.title = 'Close';
    closeX.appendChild(makeSVG('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z', 18, 18));
    closeX.addEventListener('click', closeSettings);
    h2.appendChild(closeX);
    box.appendChild(h2);

    // List
    const list = document.createElement('div');
    list.id = 'yt-qb-list';

    function buildRows() {
      list.replaceChildren();
      rows.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'yt-qb-row';

        const inputs = document.createElement('div');
        inputs.className = 'yt-qb-row-inputs';

        const nameInput = document.createElement('input');
        nameInput.className = 'yt-qb-input';
        nameInput.placeholder = 'Button label  (e.g. 👋 Hi)';
        nameInput.value = item.name;
        nameInput.addEventListener('input', () => { rows[i].name = nameInput.value; });

        const textInput = document.createElement('input');
        textInput.className = 'yt-qb-input';
        textInput.placeholder = 'Message to send in chat';
        textInput.value = item.text;
        textInput.addEventListener('input', () => { rows[i].text = textInput.value; });

        inputs.appendChild(nameInput);
        inputs.appendChild(textInput);

        // Move up
        const upBtn = document.createElement('button');
        upBtn.className = 'yt-qb-icon-btn';
        upBtn.title = 'Move up';
        upBtn.disabled = i === 0;
        upBtn.appendChild(makeSVG('M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z', 16, 16));
        upBtn.addEventListener('click', () => {
          if (i === 0) return;
          [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
          buildRows();
        });

        // Move down
        const downBtn = document.createElement('button');
        downBtn.className = 'yt-qb-icon-btn';
        downBtn.title = 'Move down';
        downBtn.disabled = i === rows.length - 1;
        downBtn.appendChild(makeSVG('M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z', 16, 16));
        downBtn.addEventListener('click', () => {
          if (i === rows.length - 1) return;
          [rows[i], rows[i + 1]] = [rows[i + 1], rows[i]];
          buildRows();
        });

        // Delete
        const delBtn = document.createElement('button');
        delBtn.className = 'yt-qb-icon-btn delete';
        delBtn.title = 'Delete';
        delBtn.appendChild(makeSVG('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z', 16, 16));
        delBtn.addEventListener('click', () => { rows.splice(i, 1); buildRows(); });

        row.appendChild(inputs);
        row.appendChild(upBtn);
        row.appendChild(downBtn);
        row.appendChild(delBtn);
        list.appendChild(row);
      });
    }

    buildRows();
    box.appendChild(list);

    // Footer
    const footer = document.createElement('div');
    footer.id = 'yt-qb-modal-footer';

    const addBtn = document.createElement('button');
    addBtn.className = 'yt-qb-action-btn add';
    addBtn.textContent = '+ Add Button';
    addBtn.addEventListener('click', () => {
      rows.push({ name: '', text: '' });
      buildRows();
      list.scrollTop = list.scrollHeight;
    });

    const resetBtn = document.createElement('button');
    resetBtn.className = 'yt-qb-action-btn secondary';
    resetBtn.textContent = 'Reset to Defaults';
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset all buttons to defaults?')) return;
      rows.length = 0;
      DEFAULT_BUTTONS.forEach(b => rows.push({ ...b }));
      buildRows();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'yt-qb-action-btn primary';
    saveBtn.textContent = '💾 Save';
    saveBtn.addEventListener('click', () => {
      const valid = rows.filter(r => r.name.trim() || r.text.trim());
      saveConfig(valid);
      refreshPanel();
      closeSettings();
    });

    footer.appendChild(addBtn);
    footer.appendChild(resetBtn);
    footer.appendChild(saveBtn);
    box.appendChild(footer);

    modal.appendChild(box);
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeSettings(); });
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeSettings() {
    document.getElementById(SETTINGS_ID)?.remove();
  }

  /* ── Send a message through YouTube's chat ── */
  function sendChatMessage(text, btn, name) {
    const iframe = document.querySelector('#chatframe');
    if (!iframe) return flashBtn(btn, false, name);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return flashBtn(btn, false, name);

    const input = doc.querySelector('#input[contenteditable]');
    if (!input) return flashBtn(btn, false, name);

    input.focus();
    doc.execCommand('selectAll', false, null);
    doc.execCommand('insertText', false, text);

    if (!input.textContent.trim()) {
      input.textContent = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    setTimeout(() => {
      const sendBtn =
        doc.querySelector('#send-button button') ||
        doc.querySelector('yt-button-renderer#send-button button') ||
        doc.querySelector('#submit-button');

      if (sendBtn) {
        sendBtn.click();
        flashBtn(btn, true, name);
      } else {
        input.dispatchEvent(new KeyboardEvent('keydown',
          { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        flashBtn(btn, true, name);
      }
    }, 80);
  }

  /* ── Brief visual feedback ── */
  function flashBtn(btn, success, name) {
    if (btn.classList.contains('holding')) return;
    btn.classList.add('sent');
    btn.textContent = success ? '✓ Sent' : '✗ Error';
    setTimeout(() => {
      btn.classList.remove('sent');
      btn.textContent = name;
    }, 1200);
  }

  /* ── Detect live stream — multiple signals ── */
  function isLiveStream() {
    if (document.querySelector('.ytp-live')) return true;
    if (document.querySelector('ytd-badge-supported-renderer .badge-style-type-live-now-alternate')) return true;
    // If the live chat frame is present and visible, we're on a live
    const chatFrame = document.querySelector('ytd-live-chat-frame');
    if (chatFrame && chatFrame.offsetParent !== null) return true;
    return false;
  }

  /* ── Get the live chat iframe's document ── */
  function getChatDoc() {
    const iframe = document.querySelector('#chatframe');
    if (!iframe) return null;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      // Make sure the doc is actually loaded and accessible
      if (doc && doc.body && doc.location.href !== 'about:blank') return doc;
    } catch (_) {}
    return null;
  }

  /* ── Find the input panel inside the chat iframe ── */
  function findInputPanel(doc) {
    return (
      doc.querySelector('#input-panel') ||
      doc.querySelector('yt-live-chat-message-input-renderer') ||
      doc.querySelector('#chat-messages')
    );
  }

  function unmount() {
    document.getElementById('yt-qb-row')?.remove();
    document.getElementById(PANEL_ID)?.remove();
    const doc = getChatDoc();
    if (doc) {
      doc.getElementById('yt-qb-row')?.remove();
      doc.getElementById(PANEL_ID)?.remove();
      doc.getElementById('yt-qb-styles')?.remove();
    }
  }

  /* ── Inject styles into a document (main or iframe) ── */
  function injectStylesInto(doc) {
    if (doc.getElementById('yt-qb-styles')) return;
    const src = document.getElementById('yt-qb-styles');
    if (!src) return;
    const clone = doc.createElement('style');
    clone.id = 'yt-qb-styles';
    clone.textContent = src.textContent;
    doc.head.appendChild(clone);
  }

  /* ── Try to inject inside the iframe (preferred — above Chat... input) ── */
  function tryMountInIframe() {
    const chatDoc = getChatDoc();
    if (!chatDoc) return false;
    const inputPanel = findInputPanel(chatDoc);
    if (!inputPanel) return false;
    injectStylesInto(chatDoc);
    const { row, panel } = buildUI(loadConfig());
    inputPanel.parentElement.insertBefore(row, inputPanel);
    inputPanel.parentElement.insertBefore(panel, inputPanel);
    return true;
  }

  /* ── Fallback: inject in the main doc, right after the iframe element ── */
  function tryMountInMainDoc() {
    const chatFrame = document.querySelector('ytd-live-chat-frame');
    if (!chatFrame) return false;
    const { row, panel } = buildUI(loadConfig());
    const iframe = chatFrame.querySelector('#chatframe');
    const ref = iframe ? iframe.nextSibling : null;
    chatFrame.insertBefore(panel, ref);
    chatFrame.insertBefore(row, panel);
    return true;
  }

  /* ── Polling mount: retries every 500ms ── */
  let pollTimer  = null;
  let pollTicks  = 0;
  const POLL_MAX = 30; // give up after 15 s (30 × 500 ms)

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    pollTicks = 0;
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
      if (!isLiveStream()) { unmount(); stopPolling(); return; }

      // Already mounted somewhere
      const chatDoc = getChatDoc();
      if (document.getElementById('yt-qb-row') ||
          (chatDoc && chatDoc.getElementById('yt-qb-row'))) {
        stopPolling(); return;
      }

      // Give up after POLL_MAX ticks
      if (++pollTicks > POLL_MAX) { stopPolling(); return; }

      injectStyles();

      // Try iframe first; fall back to main doc
      if (!tryMountInIframe()) tryMountInMainDoc();
    }, 500);
  }

  // Watch for SPA navigations
  let navObserver = null;
  function startNavObserver() {
    if (navObserver) navObserver.disconnect();
    navObserver = new MutationObserver(() => {
      if (!isLiveStream()) unmount();
    });
    navObserver.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('load', () => {
    startNavObserver();
    startPolling();
  });

  document.addEventListener('yt-navigate-finish', () => {
    unmount();
    stopPolling();
    setTimeout(startPolling, 800);
  });

})();
