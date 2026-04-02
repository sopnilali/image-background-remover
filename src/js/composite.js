/**
 * Composites foreground (RGBA) onto transparent, solid, gradient, or image background.
 */

/** @typedef {'transparent' | 'solid' | 'gradient' | 'image'} BgMode */

/**
 * @param {HTMLCanvasElement} displayCanvas
 * @param {HTMLCanvasElement} foregroundCanvas
 * @param {{
 *   mode: BgMode
 *   solidColor: string
 *   gradientPreset: string
 *   bgImage: CanvasImageSource | null
 * }} opts
 */
export function redrawComposite(displayCanvas, foregroundCanvas, opts) {
  const w = foregroundCanvas.width
  const h = foregroundCanvas.height
  if (displayCanvas.width !== w || displayCanvas.height !== h) {
    displayCanvas.width = w
    displayCanvas.height = h
  }
  const ctx = displayCanvas.getContext('2d', { alpha: true })
  if (!ctx) return

  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const { mode, solidColor, gradientPreset, bgImage } = opts

  if (mode === 'transparent') {
    ctx.clearRect(0, 0, w, h)
  } else if (mode === 'solid') {
    ctx.fillStyle = solidColor
    ctx.fillRect(0, 0, w, h)
  } else if (mode === 'gradient') {
    const g = makeGradient(ctx, w, h, gradientPreset)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  } else if (mode === 'image' && bgImage) {
    drawCoverImage(ctx, bgImage, w, h)
  } else {
    ctx.clearRect(0, 0, w, h)
  }

  ctx.drawImage(foregroundCanvas, 0, 0)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {string} preset
 */
function makeGradient(ctx, w, h, preset) {
  switch (preset) {
    case 'ocean': {
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, '#0ea5e9')
      g.addColorStop(1, '#0369a1')
      return g
    }
    case 'mint': {
      const g = ctx.createLinearGradient(0, 0, w, 0)
      g.addColorStop(0, '#6ee7b7')
      g.addColorStop(1, '#14b8a6')
      return g
    }
    case 'slate': {
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, '#64748b')
      g.addColorStop(1, '#1e293b')
      return g
    }
    case 'sunset':
    default: {
      const g = ctx.createLinearGradient(0, h, w, 0)
      g.addColorStop(0, '#f97316')
      g.addColorStop(0.5, '#ec4899')
      g.addColorStop(1, '#8b5cf6')
      return g
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} img
 * @param {number} w
 * @param {number} h
 */
function drawCoverImage(ctx, img, w, h) {
  const iw = /** @type {HTMLImageElement} */ (img).naturalWidth || w
  const ih = /** @type {HTMLImageElement} */ (img).naturalHeight || h
  const scale = Math.max(w / iw, h / ih)
  const tw = iw * scale
  const th = ih * scale
  const x = (w - tw) / 2
  const y = (h - th) / 2
  ctx.drawImage(img, x, y, tw, th)
}
