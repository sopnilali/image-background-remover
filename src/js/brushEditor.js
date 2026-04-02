/**
 * Erase / restore brush on the foreground alpha channel with real-time composite refresh.
 */

/**
 * @param {HTMLCanvasElement} displayCanvas
 * @param {HTMLCanvasElement} foregroundCanvas
 * @param {Uint8Array} initialAlpha — per-pixel alpha from first cutout (width * height)
 * @param {() => void} onRedraw — call composite.redrawComposite after mutations
 * @param {() => 'erase' | 'restore'} getMode
 * @param {() => number} getBrushSize
 */
export function attachBrushEditor(
  displayCanvas,
  foregroundCanvas,
  initialAlpha,
  onRedraw,
  getMode,
  getBrushSize,
) {
  let drawing = false

  function getCoords(e) {
    const rect = displayCanvas.getBoundingClientRect()
    const scaleX = foregroundCanvas.width / rect.width
    const scaleY = foregroundCanvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    return { x, y }
  }

  function paintAt(x, y) {
    const ctx = foregroundCanvas.getContext('2d')
    if (!ctx) return
    const w = foregroundCanvas.width
    const h = foregroundCanvas.height
    const data = ctx.getImageData(0, 0, w, h)
    const d = data.data
    const mode = getMode()
    const radius = getBrushSize() / 2
    const r2 = radius * radius

    for (let py = Math.max(0, Math.floor(y - radius)); py <= Math.min(h - 1, Math.ceil(y + radius)); py++) {
      for (let px = Math.max(0, Math.floor(x - radius)); px <= Math.min(w - 1, Math.ceil(x + radius)); px++) {
        const dx = px - x
        const dy = py - y
        if (dx * dx + dy * dy > r2) continue
        const i = (py * w + px) * 4 + 3
        const idx = py * w + px
        if (mode === 'erase') {
          d[i] = 0
        } else {
          d[i] = initialAlpha[idx] ?? 0
        }
      }
    }
    ctx.putImageData(data, 0, 0)
    onRedraw()
  }

  function linePaint(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0)
    const step = Math.max(1, getBrushSize() / 6)
    const n = Math.ceil(dist / step)
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0 : i / n
      const x = x0 + (x1 - x0) * t
      const y = y0 + (y1 - y0) * t
      paintAt(x, y)
    }
  }

  let lastX = 0
  let lastY = 0

  function onDown(e) {
    if (e.button !== 0) return
    drawing = true
    const { x, y } = getCoords(e)
    lastX = x
    lastY = y
    paintAt(x, y)
  }

  function onMove(e) {
    if (!drawing) return
    const { x, y } = getCoords(e)
    linePaint(lastX, lastY, x, y)
    lastX = x
    lastY = y
  }

  function onUp() {
    drawing = false
  }

  displayCanvas.addEventListener('pointerdown', onDown)
  displayCanvas.addEventListener('pointermove', onMove)
  displayCanvas.addEventListener('pointerup', onUp)
  displayCanvas.addEventListener('pointerleave', onUp)

  displayCanvas.style.cursor = 'crosshair'

  return () => {
    displayCanvas.removeEventListener('pointerdown', onDown)
    displayCanvas.removeEventListener('pointermove', onMove)
    displayCanvas.removeEventListener('pointerup', onUp)
    displayCanvas.removeEventListener('pointerleave', onUp)
  }
}
