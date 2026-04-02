/**
 * Application state — single source of truth for the editor session.
 */

/** @type {HTMLCanvasElement | null} */
export let foregroundCanvas = null

/** @type {Uint8Array | null} Alpha from first segmentation, per pixel (width * height) */
export let initialAlpha = null

/** @type {{ file: File, originalUrl: string, processedBlob: Blob, name: string }[]} */
export let batchItems = []

export let currentIndex = 0

/** @type {'transparent' | 'solid' | 'gradient' | 'image'} */
export let bgMode = 'transparent'

export let bgSolid = '#e8eef5'
export let bgGradientPreset = 'sunset'
/** @type {HTMLImageElement | null} */
export let bgImageEl = null

/** @type {'erase' | 'restore'} */
export let brushMode = 'erase'

export let brushSize = 40

export function setForegroundCanvas(canvas) {
  foregroundCanvas = canvas
}

export function setInitialAlpha(alpha) {
  initialAlpha = alpha
}

export function setBatchItems(items) {
  batchItems = items
  currentIndex = 0
}

/** Append processed items without changing the selected thumbnail index. */
export function appendBatchItems(items) {
  batchItems = batchItems.concat(items)
}

export function setCurrentIndex(i) {
  currentIndex = i
}

export function setBgMode(mode) {
  bgMode = mode
}

export function setBgSolid(hex) {
  bgSolid = hex
}

export function setBgGradientPreset(preset) {
  bgGradientPreset = preset
}

export function setBgImageEl(img) {
  bgImageEl = img
}

export function setBrushMode(mode) {
  brushMode = mode
}

export function setBrushSize(n) {
  brushSize = n
}

export function getCurrentItem() {
  return batchItems[currentIndex] ?? null
}
