/**
 * File validation and drag-and-drop helpers for image uploads.
 */

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * @param {File} file
 * @returns {boolean}
 */
export function isValidImageFile(file) {
  return ALLOWED.has(file.type)
}

/**
 * @param {FileList | File[]} list
 * @returns {File[]}
 */
export function filterValidFiles(list) {
  const out = []
  for (let i = 0; i < list.length; i++) {
    const f = list[i]
    if (isValidImageFile(f)) out.push(f)
  }
  return out
}

/**
 * @param {HTMLElement} zone
 * @param {(files: File[]) => void} onFiles
 */
export function bindDropZone(zone, onFiles) {
  ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach((ev) => {
    zone.addEventListener(ev, (e) => {
      e.preventDefault()
      e.stopPropagation()
    })
  })

  zone.addEventListener('dragenter', () => zone.classList.add('dragging'))
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'))
  zone.addEventListener('drop', (e) => {
    zone.classList.remove('dragging')
    const dt = e.dataTransfer
    if (!dt?.files?.length) return
    const valid = filterValidFiles(dt.files)
    if (valid.length) onFiles(valid)
  })

  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      zone.click()
    }
  })
}
