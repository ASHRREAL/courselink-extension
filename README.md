# CourseLink+ Browser Extension

> **Supercharges the University of Guelph CourseLink (D2L Brightspace)** with features that reduce clicks, surface important info, and make the interface much more pleasant to use.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧭 **QuickNav Sidebar** | Fixed left-side panel with 1-click links to Grades, Assignments, Discussions, Content, Calendar |
| ⏰ **Deadline Ticker** | Color-coded chip strip at the top showing upcoming due dates (🔴 <24h · 🟡 <3d · 🟢 ok) |
| 📊 **Grade Calculator** | Floating card on the Grades page — shows weighted avg, letter grade, and a what-if slider |
| ⌨️ **Ctrl+K Spotlight** | Press `Ctrl+K` anywhere to open a fast search/navigation overlay |
| ✅ **Assignment Badges** | Color-coded `Submitted / Missing / Graded / Pending` tags on Dropbox pages |
| ⚡ **Course Quick Access** | Jump straight to Grades, Assignments, Content from course cards on the homepage |
| 🔔 **Notification Cleaner** | "Mark All Read" button on the notifications page |
| 🌙 **Dark Mode** | Full dark theme toggle (bottom-right button or via popup settings) |

---

## 🚀 Installation

### Chrome / Chromium / Brave / Edge

1. Open your browser and go to: `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `courselink-extension` folder
5. The **CL+** icon will appear in your toolbar ✅

### Firefox

1. Open Firefox and go to: `about:debugging`
2. Click **"This Firefox"** on the left sidebar
3. Click **"Load Temporary Add-on…"**
4. Select the `manifest.json` file inside `courselink-extension/`
5. The **CL+** icon will appear in your toolbar ✅

> **Note:** Firefox temporary add-ons are removed when the browser closes. For persistent use, use Chrome/Chromium.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open quick-search spotlight |
| `Esc` | Close spotlight |
| `↑` / `↓` | Navigate spotlight results |
| `↵` | Open selected result |

---

## ⚙️ Settings

Click the **CL+** icon in your browser toolbar to open the settings popup.  
All settings are saved automatically and persist across page loads.

---

## 📁 File Structure

```
courselink-extension/
  manifest.json      ← Extension definition (Manifest V3)
  content.js         ← All features injected into CourseLink pages
  content.css        ← All styles (dark mode, sidebar, cards, etc.)
  popup.html         ← Settings popup UI
  popup.css          ← Popup styles
  popup.js           ← Popup logic
  icons/
    icon16.png
    icon48.png
    icon128.png
```

---

## 🔒 Privacy

- **No data is sent anywhere.** All processing is local.
- Settings are stored in `localStorage` — only accessible to the extension on `courselink.uoguelph.ca`.
- No analytics, no tracking.
