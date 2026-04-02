/**
 * Bootstrap toast notifications for errors and status.
 */

import { Toast } from 'bootstrap'

/**
 * @param {string} message
 * @param {'danger' | 'success' | 'info'} variant
 */
export function showToast(message, variant = 'info') {
  const container = document.getElementById('toast-container')
  if (!container) return

  const wrapper = document.createElement('div')
  wrapper.className = 'toast align-items-center text-bg-' + variant + ' border-0'
  wrapper.setAttribute('role', 'alert')
  wrapper.setAttribute('aria-live', 'assertive')
  wrapper.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `
  container.appendChild(wrapper)
  const t = new Toast(wrapper, { delay: 5000 })
  t.show()
  wrapper.addEventListener('hidden.bs.toast', () => wrapper.remove())
}

/** @param {string} s */
function escapeHtml(s) {
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}
