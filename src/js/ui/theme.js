/**
 * Dark / light theme toggle with localStorage persistence.
 */

const STORAGE_KEY = 'clearcut-theme'

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = saved === 'dark' || saved === 'light' ? saved : prefersDark ? 'dark' : 'light'
  applyTheme(theme)

  const btn = document.getElementById('btn-theme-toggle')
  const icon = document.getElementById('theme-icon')
  btn?.addEventListener('click', () => {
    const html = document.documentElement
    const next = html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    if (icon) {
      icon.className = next === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars'
    }
  })

  if (icon) {
    icon.className =
      document.documentElement.getAttribute('data-bs-theme') === 'dark'
        ? 'bi bi-sun'
        : 'bi bi-moon-stars'
  }
}

/** @param {'light' | 'dark'} theme */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme)
}
