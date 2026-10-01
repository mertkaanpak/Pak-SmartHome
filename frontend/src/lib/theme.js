// Theme-Verwaltung: 'system' folgt der Betriebssystem-Einstellung,
// 'light'/'dark' erzwingen ein Theme über <html data-theme="…">.
const STORAGE_KEY = 'pak-smarthome-theme'

export function getTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme
  } else {
    delete document.documentElement.dataset.theme
  }
}

export function setTheme(theme) {
  try {
    if (theme === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Browser-Speicher nicht verfügbar — Theme gilt dann nur für die Sitzung
  }
  applyTheme(theme)
}

export function initTheme() {
  applyTheme(getTheme())
}
