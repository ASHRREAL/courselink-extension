/**
 * CourseLink+ Content Script v2
 * Fixes: dark mode (overrides D2L tokens), smart OU detection,
 * removed deadline ticker, fixed assignment row styling,
 * UI polish infused into the page.
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────
     SETTINGS
  ───────────────────────────────────────────────────────── */
  const DEFAULTS = {
    darkMode:       false,
    quickNav:       true,
    gradeCalc:      true,
    searchHotkey:   true,
    assignRowStyle: true,
    quickAccess:    true,
  };

  function getSettings() {
    try {
      const stored = localStorage.getItem('clplus_settings');
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
  }
  function saveSettings(s) {
    try { localStorage.setItem('clplus_settings', JSON.stringify(s)); } catch {}
  }

  let settings = getSettings();

  /* ─────────────────────────────────────────────────────────
     ORG UNIT ID DETECTION
     Priority: JS Global var → URL param → URL path → data attr
  ───────────────────────────────────────────────────────── */
  function getOrgUnitId() {
    // 1. D2L injects a Global JS object with OrgUnitId
    try {
      if (window.Global && window.Global.OrgUnitId && window.Global.OrgUnitId !== 6605) {
        return String(window.Global.OrgUnitId);
      }
    } catch {}

    // 2. URL query ?ou=XXXX
    const ouParam = new URLSearchParams(window.location.search).get('ou');
    if (ouParam) return ouParam;

    // 3. URL path e.g. /d2l/le/content/1022413/...
    const pathMatch = window.location.pathname.match(/\/d2l\/\w+\/\w+\/(\d{5,})\//);
    if (pathMatch) return pathMatch[1];

    // 4. data-global-context on <html>
    try {
      const ctx = document.documentElement.dataset.globalContext;
      if (ctx) {
        const parsed = JSON.parse(ctx);
        if (parsed.orgUnitId && parsed.orgUnitId !== '6605') return parsed.orgUnitId;
      }
    } catch {}

    return null; // homepage or unknown
  }

  const pathname = window.location.pathname.toLowerCase();
  const search   = window.location.search.toLowerCase();

  function isPage(...fragments) {
    return fragments.some(f => pathname.includes(f) || search.includes(f));
  }

  /* ─────────────────────────────────────────────────────────
     SVG ICONS (Lucide-style)
  ───────────────────────────────────────────────────────── */
  function svg(d) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  }
  const I = {
    home:    svg('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>'),
    grades:  svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
    upload:  svg('<polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>'),
    chat:    svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    book:    svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
    users:   svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    bell:    svg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'),
    cal:     svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    search:  svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
    check:   svg('<polyline points="20,6 9,17 4,12"/>'),
    arrow:   svg('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>'),
    moon:    svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
    sun:     svg('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'),
    quiz: svg('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'),
  };

  /* ─────────────────────────────────────────────────────────
     1. DARK MODE
     Strategy: override D2L's own CSS custom properties on <html>
     These cascade through shadow DOM automatically.
  ───────────────────────────────────────────────────────── */
  let darkStyleEl = null;
  let darkRefreshTimer = null;

  // CSS injected into shadow roots — only propagate tokens + text color.
  // We deliberately do NOT set background-color on :host because components
  // like d2l-grade-result need their own colors to show grade scores.
  const DARK_SHADOW_CSS = `
    :host {
      --d2l-color-regolith: #1e2128;
      --d2l-color-sylvite:  #161920;
      --d2l-color-gypsum:   #252830;
      --d2l-color-mica:     #2e3340;
      --d2l-color-corundum: #3a4050;
      --d2l-color-chromite: #5a6070;
      --d2l-color-galena:   #7a8090;
      --d2l-color-tungsten: #9ca3af;
      --d2l-color-ferrite:  #e8eaf0;
      --d2l-color-background-base:    #161920;
      --d2l-color-background-default: #1e2128;
      --d2l-color-border-medium:      #2e3340;
      --d2l-color-font-base:          #e8eaf0;
      color: var(--d2l-color-font-base, #e8eaf0);
    }

    /* ── Dropdown / popover / menu surfaces ── */
    .d2l-dropdown-content-pointer,
    .d2l-dropdown-content-container,
    .d2l-dropdown-content-inner,
    .d2l-dropdown-content-width,
    .d2l-dropdown-content-header,
    .d2l-dropdown-content-body,
    .d2l-menu,
    .d2l-menu-items,
    .d2l-menu-item,
    .d2l-menu-item-text,
    d2l-dropdown-content,
    d2l-dropdown-menu,
    d2l-dropdown-more,
    [class*="dropdown-content"],
    [class*="dropdown-menu"],
    [class*="d2l-menu-item"],
    div[class*="content-container"],
    div[class*="content-inner"],
    d2l-enrollment-tile,
    d2l-enrollment-tile-content,
    d2l-enrollment-tile-footer,
    d2l-course-selector,
    d2l-course-selector-item,
    d2l-course-tile-text,
    d2l-course-tile-title,
    d2l-course-tile-meta {
      background-color: #1e2128 !important;
      color: #e8eaf0 !important;
      border-color: #2e3340 !important;
    }

    d2l-course-selector-item[aria-selected="true"],
    [class*="course-selector-item"][aria-selected="true"],
    [class*="course-selector-item"].d2l-selected {
      background-color: #252830 !important;
      color: #e8eaf0 !important;
    }

    /* ── Course cards (homepage) ── */
    d2l-my-courses-enrollment-card,
    d2l-my-courses-card-grid-v2,
    .d2l-enrollment-card-image-container,
    .d2l-enrollment-card-content-flex,
    [slot="content"],
    [class*="d2l-course-tile"],
    .d2l-course-tile,
    .d2l-card,
    d2l-enrollment-card,
    d2l-card,
    .d2l-card-container,
    .d2l-card-content,
    .d2l-card-footer,
    d2l-course-card,
    d2l-course-tile-image,
    d2l-course-tile-content,
    d2l-course-tile-footer,
    d2l-course-tile,
    d2l-enrollment-tile,
    d2l-enrollment-tile-content,
    d2l-enrollment-tile-footer {
      background-color: #1e2128 !important;
      color: #e8eaf0 !important;
      border-color: #2e3340 !important;
    }
    .d2l-course-text { color: #e8eaf0 !important; }

    /* ── Menu item interactivity ── */
    .d2l-menu-item:hover,
    .d2l-menu-item:focus,
    [class*="d2l-menu-item"]:hover,
    [class*="d2l-menu-item"]:focus,
    d2l-menu-item:hover,
    d2l-menu-item:focus {
      background-color: #252830 !important;
    }

    /* ── Search inputs inside dropdowns (course selector) ── */
    input, textarea, select,
    d2l-input-search,
    d2l-input-text {
      background-color: #252830 !important;
      color: #e8eaf0 !important;
      border-color: #3a4050 !important;
    }
    input::placeholder { color: #7a8090 !important; }

    /* ── Notification panel ── */
    [class*="notification"],
    [class*="alert-item"],
    [class*="subscription"],
    d2l-notification,
    d2l-alert-toast,
    d2l-alert-toast-button,
    d2l-notification-list,
    d2l-alert-subscription,
    d2l-labs-notification {
      background-color: #1e2128 !important;
      color: #e8eaf0 !important;
      border-color: #2e3340 !important;
    }

    /* Course tile text areas (deep inside shadow DOM) */
    d2l-course-tile-text,
    d2l-course-tile-title,
    d2l-course-tile-meta,
    d2l-enrollment-tile-text,
    d2l-card-content-link,
    d2l-card-footer-link,
    d2l-enrollment-tile-content-link,
    [class*="tile-text"],
    [class*="tile-title"],
    [class*="tile-meta"],
    [class*="card-content"],
    [class*="card-footer"],
    [class*="enrollment-tile-content"],
    [class*="enrollment-tile-footer"] {
      color: #e8eaf0 !important;
    }

    /* ── Grade readability in dark mode ── */
    [class*="d2l-grade-result"],
    [class*="d2l-grade"],
    [class*="grade-result"],
    [class*="score"] {
      color: #e8eaf0 !important;
    }
    [class*="d2l-grade-result"] *,
    [class*="d2l-grade"] *,
    [class*="grade-result"] * {
      color: #e8eaf0 !important;
    }
    /* Fix inline-styled colored grade text (D2L hardcodes red for low grades) */
    [style*="color: rgb(220"],
    [style*="color: rgb(255"],
    [style*="color: #dc"],
    [style*="color: #DC"],
    [style*="color:#dc"],
    [style*="color:#DC"],
    [style*="color:red"],
    [style*="color: red"],
    [style*="color:#ff"],
    [style*="color: #ff"],
    [style*="color:#FF"],
    [style*="color: #FF"] {
      color: #e8eaf0 !important;
    }

    [style*="background-color:#FFF1EA"],
    [style*="background-color: #FFF1EA"],
    [style*="background-color:#FFEDE8"],
    [style*="background-color: #FFEDE8"],
    [style*="background-color:#fff1ea"],
    [style*="background-color: #fff1ea"],
    [style*="background-color: rgb(255, 241, 234)"],
    [style*="background-color: rgb(255,241,234)"] {
      background-color: transparent !important;
      box-shadow: none !important;
      border: none !important;
    }

    /* Keep course selector item hover dark in dropdowns */
    d2l-course-selector-item:hover,
    d2l-course-selector-item:focus,
    [class*="course-selector-item"]:hover,
    [class*="course-selector-item"]:focus,
    [class*="course-selector-item"] a:hover {
      background-color: #252830 !important;
      color: #e8eaf0 !important;
    }

    /* ── Links ── */
    a { color: #60a5fa !important; }
    a:visited { color: #818cf8 !important; }
    a:hover, a:focus { color: #93c5fd !important; }

    /* ── White background overrides ── */
    [style*="background-color: rgb(255, 255, 255)"],
    [style*="background-color:#ffffff"],
    [style*="background-color: white"],
    [style*="background:#fff"],
    [style*="background: white"],
    [style*="background-color: rgb(249"],
    [style*="background-color: rgb(245"],
    [style*="background-color: rgb(240"],
    [style*="background-color: #fff"],
    [style*="background-color:#fff"] {
      background-color: #1e2128 !important;
    }

    /* ── Borders / separators ── */
    hr, [class*="separator"], [class*="divider"] {
      border-color: #2e3340 !important;
      background-color: #2e3340 !important;
    }
  `;

  // Inject dark style into a shadow root
  function darkifyShadow(root) {
    if (!root || root.querySelector('#cl-shadow-dark')) return;
    const s = document.createElement('style');
    s.id = 'cl-shadow-dark';
    s.textContent = DARK_SHADOW_CSS;
    root.appendChild(s);
  }

  // Remove dark style from a shadow root
  function undarkifyShadow(root) {
    root?.querySelector('#cl-shadow-dark')?.remove();
  }

  // Walk all shadow roots in the document and apply/remove dark
  function updateAllShadowRoots(apply) {
    if (!document.body) return;

    const queue = [document];
    const seenRoots = new WeakSet();

    while (queue.length) {
      const root = queue.shift();
      if (!root || seenRoots.has(root)) continue;
      seenRoots.add(root);

      if (!root.querySelectorAll) continue;
      root.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) {
          apply ? darkifyShadow(el.shadowRoot) : undarkifyShadow(el.shadowRoot);
          queue.push(el.shadowRoot);
        }
      });
    }
  }

  // Some D2L widgets attach shadow roots after initial paint; refresh dark injection briefly.
  function scheduleDarkRefreshPasses() {
    if (darkRefreshTimer) {
      clearInterval(darkRefreshTimer);
      darkRefreshTimer = null;
    }

    let passes = 0;
    darkRefreshTimer = setInterval(() => {
      if (!settings.darkMode) {
        clearInterval(darkRefreshTimer);
        darkRefreshTimer = null;
        return;
      }

      updateAllShadowRoots(true);
      fixGradeInlineColors();

      passes += 1;
      if (passes >= 12) {
        clearInterval(darkRefreshTimer);
        darkRefreshTimer = null;
      }
    }, 900);
  }

  // Fix D2L's hardcoded inline background-color on grade percentage cells
  function fixGradeInlineColors() {
    if (!settings.darkMode) return;
    const pastelColors = ['#E8F8FF', '#EAFFEA', '#FFEDE8', '#FFF9D6', '#e8f8ff', '#eaffea', '#ffede8', '#fff9d6'];
    document.querySelectorAll('div[style*="background-color"]').forEach(el => {
      const style = el.getAttribute('style') || '';
      for (const pc of pastelColors) {
        if (style.includes(pc)) {
          el.style.backgroundColor = 'transparent';
          // Also fix the text inside
          el.querySelectorAll('span').forEach(s => { s.style.color = '#e8eaf0'; });
          break;
        }
      }
    });
  }

  function applyDarkMode() {
    if (settings.darkMode) {
      document.documentElement.setAttribute('data-cl-dark', '');
      // Inject a <style> that overrides D2L's color tokens
      if (!darkStyleEl) {
        darkStyleEl = document.createElement('style');
        darkStyleEl.id = 'cl-dark-override';
        darkStyleEl.textContent = `
          /* Override D2L's own design tokens — cascade through shadow DOM */
          html[data-cl-dark] {
            --d2l-color-regolith: #1e2128 !important;
            --d2l-color-sylvite:  #161920 !important;
            --d2l-color-gypsum:   #252830 !important;
            --d2l-color-mica:     #2e3340 !important;
            --d2l-color-corundum: #3a4050 !important;
            --d2l-color-chromite: #5a6070 !important;
            --d2l-color-galena:   #7a8090 !important;
            --d2l-color-tungsten: #9ca3af !important;
            --d2l-color-ferrite:  #e8eaf0 !important;
            --d2l-color-background-base:    #161920 !important;
            --d2l-color-background-default: #1e2128 !important;
            --d2l-color-border-medium:      #2e3340 !important;
            --d2l-color-font-base:          #e8eaf0 !important;
            /* Navigation tokens */
            --d2l-branding-navigation-background-color: #0d0f13 !important;
            --d2l-navigation-color: #e8eaf0 !important;
            --d2l-navigation-hover-color: #ffffff !important;
          }
          /* Body & main backgrounds */
          html[data-cl-dark] body,
          html[data-cl-dark] .d2l-body,
          html[data-cl-dark] #d2l_body,
          html[data-cl-dark] .d2l-body-main-wrapper { background-color: #0d0f13 !important; color: #e8eaf0 !important; }
          /* Navigation bars — the top UofG bar and course sub-nav */
          html[data-cl-dark] .d2l-branding-navigation-background-color,
          html[data-cl-dark] .d2l-navigation-s,
          html[data-cl-dark] nav.d2l-navigation-s,
          html[data-cl-dark] .d2l-le-navbar,
          html[data-cl-dark] [class*="d2l-navbar"],
          html[data-cl-dark] d2l-labs-navigation-main-header,
          html[data-cl-dark] d2l-labs-navigation,
          html[data-cl-dark] d2l-labs-navigation-band {
            background-color: #0d0f13 !important;
            border-color: #2e3340 !important;
          }
          html[data-cl-dark] .d2l-navigation-s a,
          html[data-cl-dark] .d2l-le-navbar a,
          html[data-cl-dark] [class*="d2l-navbar"] a { color: #e8eaf0 !important; }
          /* Tables */
          html[data-cl-dark] .d2l-table > tbody,
          html[data-cl-dark] .d2l-table > tfoot { background-color: #161920 !important; }
          html[data-cl-dark] .d2l-table > * > tr:hover > * { background-color: #1e2128 !important; }
          html[data-cl-dark] td, html[data-cl-dark] th { color: #e8eaf0 !important; border-color: #2e3340 !important; }
          /* White cards/panels */
          html[data-cl-dark] .d2l-card, html[data-cl-dark] [class*="d2l-panel"],
          html[data-cl-dark] .d2l-widget, html[data-cl-dark] [class*="widget"],
          html[data-cl-dark] .d2l-collapsible-panel { background-color: #1e2128 !important; border-color: #2e3340 !important; }
          /* Links */
          html[data-cl-dark] a:not(.cl-quick-access-btn):not(.cl-spotlight-result):not(.cl-nav-item) {
            color: #60a5fa !important;
          }
          html[data-cl-dark] a:hover { color: #93c5fd !important; }
          /* Input fields */
          html[data-cl-dark] input, html[data-cl-dark] textarea, html[data-cl-dark] select {
            background-color: #1e2128 !important; color: #e8eaf0 !important; border-color: #2e3340 !important;
          }
          /* Generic headings */
          html[data-cl-dark] h1, html[data-cl-dark] h2, html[data-cl-dark] h3,
          html[data-cl-dark] h4, html[data-cl-dark] h5 { color: #e8eaf0 !important; }
          /* Inline style overrides */
          html[data-cl-dark] [style*="background-color: rgb(255, 255, 255)"],
          html[data-cl-dark] [style*="background-color:#ffffff"],
          html[data-cl-dark] [style*="background-color: white"],
          html[data-cl-dark] [style*="background: white"],
          html[data-cl-dark] [style*="background:white"] { background-color: #1e2128 !important; }
          /* Breadcrumb / page header area */
          html[data-cl-dark] .d2l-page-title,
          html[data-cl-dark] [class*="d2l-title"],
          html[data-cl-dark] [class*="d2l-heading"] { color: #e8eaf0 !important; }
          /* Dropdown menus — including the course selector waffle */
          html[data-cl-dark] .d2l-dropdown-content,
          html[data-cl-dark] [class*="dropdown"],
          html[data-cl-dark] [class*="d2l-dropdown"],
          html[data-cl-dark] .d2l-select-list,
          html[data-cl-dark] ul.d2l-dropdown-opener-list,
          html[data-cl-dark] [class*="d2l-select"],
          html[data-cl-dark] .d2l-enrollments-search-widget {
            background-color: #1e2128 !important; border-color: #2e3340 !important; color: #e8eaf0 !important;
          }
          /* Grade percentage inline bg override — D2L hardcodes these */
          html[data-cl-dark] div[style*="background-color:#E8F8FF"],
          html[data-cl-dark] div[style*="background-color: #E8F8FF"],
          html[data-cl-dark] div[style*="background-color:#EAFFEA"],
          html[data-cl-dark] div[style*="background-color: #EAFFEA"],
          html[data-cl-dark] div[style*="background-color:#FFEDE8"],
          html[data-cl-dark] div[style*="background-color: #FFEDE8"],
          html[data-cl-dark] div[style*="background-color:#FFF9D6"],
          html[data-cl-dark] div[style*="background-color: #FFF9D6"] {
            background-color: transparent !important;
          }
          html[data-cl-dark] div[style*="background-color:#E8F8FF"] span,
          html[data-cl-dark] div[style*="background-color:#EAFFEA"] span,
          html[data-cl-dark] div[style*="background-color:#FFEDE8"] span,
          html[data-cl-dark] div[style*="background-color:#FFF9D6"] span {
            color: #e8eaf0 !important;
          }
        `;
        document.head.appendChild(darkStyleEl);
      }
      // Also inject into all existing shadow roots
      updateAllShadowRoots(true);
      scheduleDarkRefreshPasses();
      // Fix inline grade percentage backgrounds
      fixGradeInlineColors();
      // Watch for new shadow roots being attached
      if (!window._clDarkObserver) {
        window._clDarkObserver = new MutationObserver(muts => {
          if (!settings.darkMode) return;
          muts.forEach(m => m.addedNodes.forEach(n => {
            if (n.nodeType === 1) {
              if (n.shadowRoot) darkifyShadow(n.shadowRoot);
              n.querySelectorAll && n.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) darkifyShadow(el.shadowRoot);
              });
            }
          }));
        });
        window._clDarkObserver.observe(document.body, { childList: true, subtree: true });
      }
    } else {
      document.documentElement.removeAttribute('data-cl-dark');
      if (darkRefreshTimer) {
        clearInterval(darkRefreshTimer);
        darkRefreshTimer = null;
      }
      if (darkStyleEl) { darkStyleEl.remove(); darkStyleEl = null; }
      updateAllShadowRoots(false);
    }
  }

  function buildDarkToggle() {
    if (document.getElementById('cl-dark-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'cl-dark-toggle';
    btn.title = 'Toggle Dark Mode (CourseLink+)';
    btn.innerHTML = settings.darkMode ? I.sun : I.moon;
    btn.addEventListener('click', () => {
      settings.darkMode = !settings.darkMode;
      saveSettings(settings);
      applyDarkMode();
      btn.innerHTML = settings.darkMode ? I.sun : I.moon;
    });
    document.body.appendChild(btn);
  }

  /* QuickNav removed — user requested sidebar removal. Ctrl+K spotlight kept. */

  /* ─────────────────────────────────────────────────────────
     3. GRADE CALCULATOR — inline banner above the table
  ───────────────────────────────────────────────────────── */
  function buildGradeCalculator() {
    if (!settings.gradeCalc) return;
    if (!isPage('/d2l/lms/grades', 'grades')) return;
    let attempts = 0;

    const tryRender = () => {
      const rows = scrapeGrades();
      if (!rows.length && attempts < 12) {
        attempts += 1;
        setTimeout(tryRender, 500);
        return;
      }

      if (!rows.length) return;

      document.getElementById('cl-grade-banner')?.remove();
      renderGradeBanner(rows);
    };

    setTimeout(tryRender, 900);
  }

  function scrapeGrades() {
    function parsePair(text) {
      if (!text) return null;
      const m = text.match(/(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)/);
      if (!m) return null;
      return { num: parseFloat(m[1]), den: parseFloat(m[2]) };
    }

    function norm(text) {
      return (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    const rows = [];

    const table = Array.from(document.querySelectorAll('table')).find(t => {
      const text = norm(t.textContent);
      return text.includes('grade item') && text.includes('weight achieved') && text.includes('grade');
    });

    const scopeRoot = table || document;
    const headerRow = Array.from(scopeRoot.querySelectorAll('tr')).find(tr => {
      const txt = norm(tr.textContent);
      return txt.includes('grade item') && txt.includes('weight achieved');
    });

    const headerCells = headerRow ? Array.from(headerRow.querySelectorAll('th, td')).map(c => norm(c.textContent)) : [];
    const pointsIdx = headerCells.findIndex(h => h.includes('points'));
    const weightAchievedIdx = headerCells.findIndex(h => h.includes('weight achieved'));
    const gradeItemIdx = headerCells.findIndex(h => h.includes('grade item'));

    const trs = scopeRoot.querySelectorAll('tbody tr, .d2l-table tr');

    // Preferred path for D2L weighted gradebooks:
    // top-level rows are rendered with <th colspan="2"> and represent category/standalone totals
    // (Assignment, Labs, Final, Project, Midterm...).
    const topLevelRows = Array.from(trs).filter(tr => tr.querySelector('th[colspan="2"]'));
    if (topLevelRows.length) {
      topLevelRows.forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('th, td'));
        if (cells.length < 3) return;

        const name = (tr.querySelector('th[colspan="2"]')?.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!name || /grade item|comments|overall feedback|view graded rubric/i.test(name)) return;

        const pointsPair = pointsIdx >= 0 && cells[pointsIdx] ? parsePair(cells[pointsIdx].textContent) : null;
        const weightPair = weightAchievedIdx >= 0 && cells[weightAchievedIdx] ? parsePair(cells[weightAchievedIdx].textContent) : null;

        // Use weight-achieved pair when present; otherwise accept points pair as fallback.
        // Keep 0/x rows (e.g., Final 0/35) to show true achieved/total progress.
        const chosen = weightPair && weightPair.den > 0
          ? weightPair
          : (pointsPair && pointsPair.den > 0 ? pointsPair : null);
        if (!chosen) return;

        const pct = (chosen.num / chosen.den) * 100;
        rows.push({
          name: name.slice(0, 35),
          scored: chosen.num,
          outOf: chosen.den,
          pct,
          weight: chosen.den,
          earnedWeight: chosen.num,
        });
      });

      if (rows.length) return rows;
    }
    trs.forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('th, td'));
      if (cells.length < 2) return;

      const nameCell = (gradeItemIdx >= 0 && cells[gradeItemIdx])
        ? cells[gradeItemIdx]
        : (cells.find(c => c.tagName === 'TH') || cells[0]);
      const name = (nameCell?.textContent || '').replace(/\s+/g, ' ').trim();
      if (!name || /grade item|comments|overall feedback|view graded rubric/i.test(name)) return;

      const pointsPair = pointsIdx >= 0 && cells[pointsIdx]
        ? parsePair(cells[pointsIdx].textContent)
        : null;
      const weightPair = weightAchievedIdx >= 0 && cells[weightAchievedIdx]
        ? parsePair(cells[weightAchievedIdx].textContent)
        : null;

      // Fallback path for alternate grade table layouts.
      if (pointsPair && weightPair && weightPair.den > 0 && weightPair.den <= 100) {
        const pct = (weightPair.num / weightPair.den) * 100;
        rows.push({
          name: name.slice(0, 35),
          scored: pointsPair.num,
          outOf: pointsPair.den,
          pct,
          weight: weightPair.den,
          earnedWeight: weightPair.num,
        });
        return;
      }

      // Non-weight fallback for courses/views without weight-achieved values.
      const pointFallback = pointsPair || parsePair(tr.textContent || '');
      if (pointFallback && pointFallback.den > 0) {
        rows.push({
          name: name.slice(0, 35),
          scored: pointFallback.num,
          outOf: pointFallback.den,
          pct: (pointFallback.num / pointFallback.den) * 100,
          weight: null,
          earnedWeight: null,
        });
        return;
      }

      let pct = null;
      cells.forEach(c => {
        const t = c.textContent.trim();
        const m = t.match(/(\d+\.?\d*)\s*%/);
        if (m && pct === null) {
          const p = parseFloat(m[1]);
          if (!isNaN(p) && p >= 0 && p <= 100) pct = p;
        }
      });

      if (pct !== null) {
        rows.push({ name: name.slice(0, 35), scored: pct, outOf: 100, pct, weight: null, earnedWeight: null });
      }
    });
    return rows;
  }

  function letterGrade(pct) {
    if (pct >= 90) return 'A+'; if (pct >= 85) return 'A';  if (pct >= 80) return 'A-';
    if (pct >= 77) return 'B+'; if (pct >= 73) return 'B';  if (pct >= 70) return 'B-';
    if (pct >= 67) return 'C+'; if (pct >= 63) return 'C';  if (pct >= 60) return 'C-';
    if (pct >= 57) return 'D+'; if (pct >= 53) return 'D';  if (pct >= 50) return 'D-';
    return 'F';
  }
  function gradeClass(pct) {
    if (pct >= 80) return 'great'; if (pct >= 70) return 'good'; if (pct >= 60) return 'avg'; return 'poor';
  }

  function renderGradeBanner(rows) {
    const graded = rows.filter(r => !isNaN(r.pct));
    const avg = graded.length ? graded.reduce((s, r) => s + r.pct, 0) / graded.length : null;
    const weightedRows = graded.filter(r => r.weight !== null && r.earnedWeight !== null);
    const countedWeight = weightedRows.reduce((s, r) => s + r.weight, 0);
    const weightedEarned = countedWeight > 0
      ? weightedRows.reduce((s, r) => s + r.earnedWeight, 0)
      : null;
    const weightedPct = countedWeight > 0
      ? (weightedEarned / countedWeight) * 100
      : avg;

    const banner = document.createElement('div');
    banner.id = 'cl-grade-banner';
    banner.innerHTML = `
      <div class="cl-grade-banner-inner">
        <div class="cl-grade-banner-stats">
          <div class="cl-grade-stat">
            <div class="cl-stat-value ${weightedPct !== null ? gradeClass(weightedPct) : ''}">${countedWeight > 0 ? `${weightedEarned.toFixed(2)} / ${countedWeight.toFixed(0)}` : (weightedPct !== null ? weightedPct.toFixed(1) + '%' : 'N/A')}</div>
          </div>
          <div class="cl-grade-stat">
            <div class="cl-stat-value ${weightedPct !== null ? gradeClass(weightedPct) : ''}">${weightedPct !== null ? weightedPct.toFixed(1) + '%' : 'N/A'}</div>
          </div>
        </div>
      </div>`;

    // Locate the "Add to ePortfolio" button or its container
    const buttons = Array.from(document.querySelectorAll('button, a.d2l-button'));
    let portfolioBtn = buttons.find(b => b.textContent && b.textContent.includes('ePortfolio'));
    
    if (!portfolioBtn) {
      portfolioBtn = document.querySelector('.d2l-action-buttons button, .d2l-action-buttons a');
    }

    const portfolioContainer = portfolioBtn?.closest('div, span, li') || portfolioBtn?.parentElement;

    if (portfolioBtn || portfolioContainer) {
      const buttonWidth = portfolioBtn ? Math.round(portfolioBtn.getBoundingClientRect().width) : 0;
      const containerWidth = portfolioContainer ? Math.round(portfolioContainer.getBoundingClientRect().width) : 0;

      const primaryText = countedWeight > 0
        ? `${weightedEarned.toFixed(2)} / ${countedWeight.toFixed(0)}`
        : (weightedPct !== null ? weightedPct.toFixed(1) + '%' : 'N/A');
      const secondaryText = weightedPct !== null ? weightedPct.toFixed(1) + '%' : 'N/A';

      // Use a larger per‑character estimate (12px) plus extra padding
      const textWidthEstimate = Math.max(primaryText.length, secondaryText.length) * 12 + 80;
      const targetWidth = Math.max(buttonWidth, containerWidth, textWidthEstimate, 180);

      if (targetWidth > 0) {
        banner.style.minWidth = `${targetWidth}px`;
        banner.style.width = 'max-content';
        banner.style.maxWidth = 'none';
        banner.style.flex = '0 0 auto';
      }

      // Prevent wrapping: use nowrap and allow horizontal scroll if needed
      const wrapper = portfolioContainer.parentElement || portfolioContainer;
      wrapper.style.cssText += `
        display: flex !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
        gap: 12px !important;
        overflow-x: auto !important;
      `;
      wrapper.appendChild(banner);
    } else {
      // Fallback: top of main content
      const main = document.querySelector(
        '.d2l-page-main-content, main, #d2l_body, [class*="d2l-main"]'
      );
      (main || document.body).insertAdjacentElement('afterbegin', banner);
    }
}

  /* ─────────────────────────────────────────────────────────
      4. CTRL+K SEARCH SPOTLIGHT — with course nav, default links, and enrollments
    ───────────────────────────────────────────────────────── */
  let spotlightOpen = false;
  let filteredLinks = [];
  let currentLinks = [];
  let focusIdx = 0;
  let cachedCourses = null;

  // Default quick navigation links (always available)
  function getSpotlightLinks() {
    const ou = getOrgUnitId();
    return [
      { title: 'My Home',            sub: 'Homepage',           href: '/d2l/home',                                                    icon: I.home },
    ];
  }

  // Scrape the current course's navigation bar (Content, Grades, Dropbox, etc.)
  function getCourseNavLinks() {
    const ou = getOrgUnitId();
    if (!ou) return [];

    const links = [];
    const seenTitles = new Set();

    // Primary: scrape the navbar
    const selectors = [
      'nav.d2l-le-navbar a',
      '.d2l-navigation-s-module-nav a',
      '[class*="d2l-navbar"] a',
      '.d2l-le-page-navbar-link',
      'd2l-navigation-s-link a',
      '[class*="navigation-s"] a',
      'nav a',
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(a => {
        const href = a.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:')) return;

        const rawText = a.textContent.trim();
        const title = rawText.replace(/[^\w\s-]/g, '').trim();
        if (!title || title.length < 2) return;
        if (seenTitles.has(title.toLowerCase())) return;
        seenTitles.add(title.toLowerCase());

        // Icon assignment
        let icon = I.book; // default
        const lower = title.toLowerCase();
        if (lower.includes('home')) icon = I.home;
        else if (lower.includes('content')) icon = I.book;
        else if (lower.includes('grade')) icon = I.grades;
        else if (lower.includes('dropbox') || lower.includes('assignment')) icon = I.upload;
        else if (lower.includes('discussion')) icon = I.chat;
        else if (lower.includes('quiz') || lower.includes('quizze')) icon = I.quiz;
        else if (lower.includes('classlist') || lower.includes('roster')) icon = I.users;
        else if (lower.includes('group')) icon = I.users;
        else if (lower.includes('survey')) icon = svg('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>');
        else if (lower.includes('help')) icon = svg('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>');

        links.push({
          title: title,
          sub: `Current Course`,
          href: href,
          icon: icon
        });
      });
    });

    // Fallback: if navbar scraping yielded nothing, construct standard course links
    if (links.length === 0) {
      const standardLinks = [
        { title: 'Course Home',    href: `/d2l/home/${ou}`,                     icon: I.home },
        { title: 'Content',        href: `/d2l/le/content/${ou}/Home`,          icon: I.book },
        { title: 'Grades',         href: `/d2l/lms/grades/gradesGrid/grid.d2l?ou=${ou}`, icon: I.grades },
        { title: 'Dropbox',        href: `/d2l/lms/dropbox/user/folders_list.d2l?ou=${ou}`, icon: I.upload },
        { title: 'Discussions',    href: `/d2l/le/discussion/${ou}/list`,       icon: I.chat },
        { title: 'Quizzes',        href: `/d2l/le/quizzes/${ou}/quizzes_list.d2l`, icon: I.quiz },
        { title: 'Classlist',      href: `/d2l/lms/classlist/classlist.d2l?ou=${ou}`, icon: I.users },
        { title: 'Groups',         href: `/d2l/le/groups/${ou}/home`,           icon: I.users },
        { title: 'Surveys',        href: `/d2l/le/surveys/${ou}/surveys_list.d2l`, icon: svg('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>') },
      ];

      standardLinks.forEach(link => {
        if (!seenTitles.has(link.title.toLowerCase())) {
          seenTitles.add(link.title.toLowerCase());
          links.push({
            ...link,
            sub: 'Current Course'
          });
        }
      });
    }

    return links;
  }

  async function fetchUserCourses() {
    if (cachedCourses) return cachedCourses;
    try {
      const res = await fetch('/d2l/api/lp/1.30/enrollments/myenrollments/');
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.Items) return [];
      cachedCourses = data.Items
        .filter(item => item.OrgUnit && item.OrgUnit.Type && item.OrgUnit.Type.Code === 'Course Offering')
        .map(item => ({
          title: item.OrgUnit.Name,
          sub: 'Course Enrollment',
          href: `/d2l/home/${item.OrgUnit.Id}`,
          icon: I.book
        }));
      return cachedCourses;
    } catch(e) {
      return [];
    }
  }

  function buildSpotlight() {
    if (!settings.searchHotkey) return;
    if (document.getElementById('cl-spotlight-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'cl-spotlight-overlay';
    overlay.innerHTML = `
      <div id="cl-spotlight-box">
        <div id="cl-spotlight-input-wrap">${I.search}<input id="cl-spotlight-input" type="text" placeholder="Navigate or search courses (e.g. engg 3380)..." autocomplete="off"/></div>
        <div id="cl-spotlight-results"></div>
        <div class="cl-spotlight-hint">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeSpotlight(); });

    const input = document.getElementById('cl-spotlight-input');
    input.addEventListener('input', () => { focusIdx = 0; renderSpotlightResults(input.value, currentLinks); });
    input.addEventListener('keydown', e => {
      const links = filteredLinks;
      if (e.key === 'Escape') { closeSpotlight(); return; }
      if (e.key === 'ArrowDown') { focusIdx = Math.min(focusIdx + 1, links.length - 1); renderSpotlightResults(input.value, currentLinks, false); e.preventDefault(); }
      if (e.key === 'ArrowUp')   { focusIdx = Math.max(focusIdx - 1, 0);                renderSpotlightResults(input.value, currentLinks, false); e.preventDefault(); }
      if (e.key === 'Enter')     { if (links[focusIdx]) { window.location.href = links[focusIdx].href; closeSpotlight(); } e.preventDefault(); }
    });
  }

  function normalizeSearch(query) {
    return query.toLowerCase().replace(/[^a-z0-9* ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function fuzzyMatch(query, title, sub) {
    const q = normalizeSearch(query);
    if (!q) return true;
    const t = (title + ' ' + sub).toLowerCase();
    if (t.includes(q)) return true;
    const keywords = q.split(' ').filter(k => k.length > 0);
    if (keywords.length > 1) {
      return keywords.every(kw => {
        if (kw.includes('*')) {
          const parts = kw.split('*').filter(p => p.length > 0);
          return parts.every(part => t.includes(part));
        }
        return t.includes(kw);
      });
    }
    const queryWords = q.split(' ').filter(w => w.length > 0);
    return queryWords.every(w => t.includes(w));
  }

  function renderSpotlightResults(query, baseLinks, reset = true) {
    if (reset) focusIdx = 0;
    filteredLinks = query.trim() ? baseLinks.filter(l => fuzzyMatch(query, l.title, l.sub)) : baseLinks;

    const container = document.getElementById('cl-spotlight-results');
    if (!container) return;
    if (!filteredLinks.length) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--cl-text-muted);font-size:13px;">No results</div>';
      return;
    }
    container.innerHTML = filteredLinks.slice(0, 10).map((l, i) => `
      <a href="${l.href}" class="cl-spotlight-result ${i === focusIdx ? 'cl-focused' : ''}" data-idx="${i}">
        <div class="cl-spotlight-result-icon">${l.icon}</div>
        <div class="cl-spotlight-result-text">
          <div class="cl-spotlight-result-title">${l.title}</div>
          <div class="cl-spotlight-result-sub">${l.sub}</div>
        </div>
        <div style="opacity:0.3">${I.arrow}</div>
      </a>`).join('');

    container.querySelectorAll('.cl-spotlight-result').forEach(el => {
      el.addEventListener('mouseenter', () => { focusIdx = +el.dataset.idx; renderSpotlightResults(document.getElementById('cl-spotlight-input')?.value || '', currentLinks, false); });
    });

    const focused = container.querySelector('.cl-focused');
    if (focused) focused.scrollIntoView({ block: 'nearest' });
  }

  async function openSpotlight() {
    spotlightOpen = true;
    const ov = document.getElementById('cl-spotlight-overlay');
    if (!ov) return;
    ov.classList.add('cl-visible');
    const inp = document.getElementById('cl-spotlight-input');
    if (inp) { inp.value = ''; inp.focus(); }

    // 1. Course navigation links (if inside a course) - refresh each time
    const courseNavLinks = getCourseNavLinks();

    // 2. Default quick links
    const defaultLinks = getSpotlightLinks();

    // 3. User enrollments (fetched async)
    const courses = await fetchUserCourses();

    // Filter out courses that are already in courseNavLinks or defaultLinks
    const navHrefs = new Set([...courseNavLinks, ...defaultLinks].map(l => l.href.toLowerCase()));
    const filteredCourses = courses.filter(c => !navHrefs.has(c.href.toLowerCase()));

    // Combine: course nav first, then default, then other courses
    currentLinks = [...courseNavLinks, ...defaultLinks, ...filteredCourses];

    renderSpotlightResults('', currentLinks);
  }

  function closeSpotlight() {
    spotlightOpen = false;
    document.getElementById('cl-spotlight-overlay')?.classList.remove('cl-visible');
  }

  // Use capture phase (true) to intercept before D2L's bubble‑phase handlers
  document.addEventListener('keydown', e => {
    if (settings.searchHotkey && (e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      e.stopPropagation();
      spotlightOpen ? closeSpotlight() : openSpotlight();
    }
    if (e.key === 'Escape' && spotlightOpen) closeSpotlight();
  }, true);

  /* ─────────────────────────────────────────────────────────
     5. ASSIGNMENT ROW STYLING
     Instead of adding badge text (the page already shows ✓/★/○),
     we style the table rows with a color-coded left border.
     Detection based on what D2L actually puts in the row text.
  ───────────────────────────────────────────────────────── */
  function buildAssignmentRowStyle() {
    if (!settings.assignRowStyle) return;
    if (!isPage('dropbox')) return;

    setTimeout(() => {
      const rows = document.querySelectorAll('tr, .d2l-table-row');
      rows.forEach(row => {
        if (row.dataset.clProcessed) return;
        row.dataset.clProcessed = '1';

        const text = row.textContent || '';

        // Skip header rows and category rows (no score text, no due date)
        const hasDueDate   = /due on|due:/i.test(text);
        const hasScore     = /\d+\.?\d*\s*\/\s*\d+/.test(text);                      // "9.43 / 10"
        const hasGraded    = /★.*graded|graded.*★/i.test(text) || hasScore;
        const hasSubmitted = /✓.*submitted|submitted.*✓/i.test(text);
        const notSubmitted = /not submitted/i.test(text);

        // Only style actual assignment rows (those with due dates OR scores)
        if (!hasDueDate && !hasScore) return;

        // Remove any existing cl border class
        row.classList.remove('cl-row-graded', 'cl-row-submitted', 'cl-row-missing');

        if (hasGraded) {
          row.classList.add('cl-row-graded');
        } else if (hasSubmitted) {
          row.classList.add('cl-row-submitted');
        } else if (notSubmitted) {
          row.classList.add('cl-row-missing');
        }
      });
    }, 1200);
  }

  /* ─────────────────────────────────────────────────────────
     7. COURSE CARD QUICK ACCESS (course selector dropdown + course page)
  ───────────────────────────────────────────────────────── */
  function buildCourseCardQuickAccess() {
    if (!settings.quickAccess) return;

    const seenCardIds = new Set();
    let scanTimer = null;

    function findAcrossShadow(selector) {
      const results = [];
      const queue = [document];
      const seenRoots = new WeakSet();

      while (queue.length) {
        const root = queue.shift();
        if (!root || seenRoots.has(root)) continue;
        seenRoots.add(root);

        if (root.querySelectorAll) {
          root.querySelectorAll(selector).forEach(el => results.push(el));
          root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) queue.push(el.shadowRoot);
          });
        }
      }
      return results;
    }

    function extractOuFromItem(item) {
      const dataOu = item.getAttribute('data-org-unit-id');
      if (dataOu) return String(dataOu);

      const hrefEl = item.querySelector('a[href*="ou="]') || item.querySelector('a[href*="/d2l/home/"]');
      const href = hrefEl?.getAttribute('href') || '';
      const byQuery = href.match(/[?&]ou=(\d{5,})/);
      if (byQuery) return byQuery[1];
      const byPath = href.match(/\/d2l\/home\/(\d{5,})/);
      if (byPath) return byPath[1];

      const idMatch = item.id?.match(/(\d{5,})/);
      return idMatch ? idMatch[1] : null;
    }

    // Inject quick access into the 9-square course selector dropdown only
    function injectInCourseSelector() {
      const dropdowns = findAcrossShadow('d2l-course-selector-item, [class*="course-selector-item"]');
      dropdowns.forEach(item => {
        const itemId = extractOuFromItem(item);
        if (!itemId) return;
        const key = 'cs-' + itemId;
        if (seenCardIds.has(key)) return;
        if (item.querySelector('.cl-qa-dropdown')) return;

        const qa = document.createElement('div');
        qa.className = 'cl-qa-dropdown';
        qa.innerHTML = [
          { label: 'Grades',      icon: I.grades, href: `/d2l/lms/grades/my_grades/main.d2l?ou=${itemId}` },
          { label: 'Assignments', icon: I.upload,  href: `/d2l/lms/dropbox/user/folders_list.d2l?ou=${itemId}` },
          { label: 'Content',     icon: I.book,    href: `/d2l/le/content/${itemId}/Home` },
        ].map(a => `<a href="${a.href}" class="cl-quick-access-btn cl-qa-drop-btn">${a.icon}<span>${a.label}</span></a>`).join('');

        const titleAnchor = item.querySelector('a, [class*="title"], [class*="name"]');
        if (titleAnchor?.parentElement) {
          titleAnchor.parentElement.insertAdjacentElement('afterend', qa);
        } else {
          item.appendChild(qa);
        }
        seenCardIds.add(key);
      });
    }

    const tryAddButtons = () => {
      injectInCourseSelector();
    };

    const scheduleScan = () => {
      if (scanTimer) return;
      scanTimer = setTimeout(() => {
        scanTimer = null;
        tryAddButtons();
      }, 120);
    };

    const obs = new MutationObserver(scheduleScan);
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(tryAddButtons, 900);
    setTimeout(tryAddButtons, 1800);
    setTimeout(tryAddButtons, 3200);
  }

  /* ─────────────────────────────────────────────────────────
     8. GENERAL UI POLISH — inject into the existing page
  ───────────────────────────────────────────────────────── */
  function buildUIPolish() {
    // Style the existing course sub-nav links (Course Home, Content, Grades...)
    // These are <a> tags in the course nav bar
    const courseNavLinks = document.querySelectorAll([
      '.d2l-navigation-s-module-nav a',
      'nav.d2l-le-navbar a',
      '[class*="d2l-navbar"] a',
      '.d2l-le-page-navbar-link',
      'a[class*="d2l-navigation"]',
    ].join(', '));

    courseNavLinks.forEach(a => {
      a.classList.add('cl-nav-link-styled');
    });

    // Add cl-styled class to main content area for better typography
    const main = document.querySelector('main, #d2l_body, .d2l-page-main-content, [class*="d2l-main"]');
    if (main) main.classList.add('cl-main-content');
  }

  /* ─────────────────────────────────────────────────────────
     SETTINGS SYNC FROM POPUP
  ───────────────────────────────────────────────────────── */
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.type === 'CLPLUS_SETTINGS_UPDATE') {
          settings = { ...settings, ...msg.settings };
          saveSettings(settings);
          applyDarkMode();
          const btn = document.getElementById('cl-dark-toggle');
          if (btn) btn.innerHTML = settings.darkMode ? I.sun : I.moon;
        }
      });
    } catch {}
  }

  /* ─────────────────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────────────────── */
  function init() {
    applyDarkMode();
    buildDarkToggle();
    // QuickNav sidebar removed per user request
    buildSpotlight();
    buildUIPolish();

    setTimeout(() => {
      buildGradeCalculator();
      buildAssignmentRowStyle();
      buildCourseCardQuickAccess();
    }, 700);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
