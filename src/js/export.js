/**
 * Download PNG — HD (full canvas) or compressed (max edge capped).
 */

/**
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {string} filename
 * @param {'hd' | 'compressed'} quality
 */
export function downloadCanvasPng(sourceCanvas, filename, quality) {
  const maxEdge = quality === 'compressed' ? 1600 : null

  if (!maxEdge || Math.max(sourceCanvas.width, sourceCanvas.height) <= maxEdge) {
    sourceCanvas.toBlob(
      (blob) => {
        if (blob) triggerDownload(blob, filename)
      },
      'image/png',
      1,
    )
    return
  }

  const scale = maxEdge / Math.max(sourceCanvas.width, sourceCanvas.height)
  const w = Math.max(1, Math.round(sourceCanvas.width * scale))
  const h = Math.max(1, Math.round(sourceCanvas.height * scale))
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const tctx = tmp.getContext('2d')
  if (!tctx) return
  tctx.imageSmoothingEnabled = true
  tctx.imageSmoothingQuality = 'high'
  tctx.drawImage(sourceCanvas, 0, 0, w, h)
  tmp.toBlob(
    (blob) => {
      if (blob) triggerDownload(blob, filename)
    },
    'image/png',
    1,
  )
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
