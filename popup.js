/**
 * CourseLink+ Popup JS
 * Reads/writes settings from localStorage,
 * syncs toggles, and tells the active tab to update.
 */

const DEFAULTS = {
  darkMode:       false,
  gradeCalc:      true,
  searchHotkey:   true,
  assignRowStyle: true,
  notifEnhance:   true,
  quickAccess:    true,
};

const KEYS = Object.keys(DEFAULTS);

function getSettings() {
  try {
    const stored = localStorage.getItem('clplus_settings');
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

function saveSettings(s) {
  try { localStorage.setItem('clplus_settings', JSON.stringify(s)); } catch {}
}

function applyToggles(settings) {
  KEYS.forEach(key => {
    const el = document.getElementById(`pref-${key}`);
    if (el) el.checked = !!settings[key];
  });
}

function applyPopupTheme(settings) {
  const theme = settings.darkMode ? 'dark' : 'light';
  document.documentElement.setAttribute('data-cl-theme', theme);
}

function initPopup() {
  const settings = getSettings();
  applyToggles(settings);
  applyPopupTheme(settings);

  KEYS.forEach(key => {
    const el = document.getElementById(`pref-${key}`);
    if (!el) return;

    // Make the whole toggle-item row clickable
    const row = el.closest('.toggle-item');
    if (row) {
      row.addEventListener('click', e => {
        // Avoid double-toggle when user directly clicks the checkbox/label
        if (e.target === el || e.target.classList.contains('toggle-slider') || e.target.classList.contains('toggle-switch')) return;
        el.checked = !el.checked;
        handleChange(key, el.checked, settings);
      });
    }

    el.addEventListener('change', () => {
      handleChange(key, el.checked, settings);
    });
  });
}

function handleChange(key, value, settings) {
  settings[key] = value;
  saveSettings(settings);
  if (key === 'darkMode') applyPopupTheme(settings);

  // Also push into the active tab's content script via window.postMessage
  // (works when the popup and page are in the same browser session)
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'CLPLUS_SETTINGS_UPDATE',
            settings: { [key]: value },
          }).catch(() => {}); // ignore if no content script
        }
      });
    }
  } catch {}
}

document.addEventListener('DOMContentLoaded', initPopup);
