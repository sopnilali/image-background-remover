/**
 * ClearCut — entry point: wires UI, batch queue, client-side removal, and export.
 */

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import '../css/styles.css'

import * as state from './js/state.js'
import { initTheme } from './js/ui/theme.js'
import { showToast } from './js/ui/toast.js'
import { removeImageBackground, startPreload } from './js/removeBg.js'
import { redrawComposite } from './js/composite.js'
import { initCompareSlider } from './js/compareSlider.js'
import { attachBrushEditor } from './js/brushEditor.js'
import { downloadCanvasPng } from './js/export.js'
import { runSequential } from './js/queue.js'
import { filterValidFiles, bindDropZone } from './js/upload.js'
import { decontaminateWhiteMatte } from './js/dematte.js'

/** @type {(() => void) | null} */
let detachBrush = null

/** @type {string | null} */
let compareAfterObjectUrl = null

const els = {
  dropZone: /** @type {HTMLElement} */ (document.getElementById('drop-zone')),
  fileInput: /** @type {HTMLInputElement} */ (document.getElementById('file-input')),
  batchToolbar: document.getElementById('batch-toolbar'),
  batchCount: document.getElementById('batch-count'),
  batchProgressBar: /** @type {HTMLDivElement} */ (document.getElementById('batch-progress-bar')),
  thumbnailStrip: /** @type {HTMLElement} */ (document.getElementById('thumbnail-strip')),
  processingPanel: document.getElementById('processing-panel'),
  processingSpinner: document.getElementById('processing-spinner'),
  processingLabel: document.getElementById('processing-label'),
  processingProgress: /** @type {HTMLDivElement} */ (document.getElementById('processing-progress')),
  processingSub: document.getElementById('processing-sub'),
  resultPanel: document.getElementById('result-panel'),
  imgOriginal: /** @type {HTMLImageElement} */ (document.getElementById('img-original')),
  canvasResult: /** @type {HTMLCanvasElement} */ (document.getElementById('canvas-result')),
  compareBefore: /** @type {HTMLImageElement} */ (document.getElementById('compare-before')),
  compareAfter: /** @type {HTMLImageElement} */ (document.getElementById('compare-after')),
  compareBeforeClip: /** @type {HTMLElement} */ (document.getElementById('compare-before-clip')),
  compareRange: /** @type {HTMLInputElement} */ (document.getElementById('compare-range')),
  btnNavUpload: document.getElementById('btn-nav-upload'),
  btnHeroUpload: document.getElementById('btn-hero-upload'),
  btnNavDownload: /** @type {HTMLButtonElement} */ (document.getElementById('btn-nav-download')),
  btnDownloadMain: /** @type {HTMLButtonElement} */ (document.getElementById('btn-download-main')),
  btnAddToBatch: document.getElementById('btn-add-to-batch'),
  brushSize: /** @type {HTMLInputElement} */ (document.getElementById('brush-size')),
  brushSizeVal: document.getElementById('brush-size-val'),
}

/** @type {'replace' | 'append'} */
let fileInputPurpose = 'replace'

function setProcessing(visible, busy = false) {
  els.processingPanel?.classList.toggle('d-none', !visible)
  els.processingPanel?.setAttribute('aria-busy', busy ? 'true' : 'false')
}

function setNavDownloadEnabled(on) {
  if (els.btnNavDownload) els.btnNavDownload.disabled = !on
}

function getBgOptions() {
  return {
    mode: state.bgMode,
    solidColor: state.bgSolid,
    gradientPreset: state.bgGradientPreset,
    bgImage: state.bgImageEl,
  }
}

function redraw() {
  const fc = state.foregroundCanvas
  if (!fc) return
  redrawComposite(els.canvasResult, fc, getBgOptions())
  scheduleCompareAfterUpdate()
}

let compareRaf = 0
function scheduleCompareAfterUpdate() {
  if (compareRaf) cancelAnimationFrame(compareRaf)
  compareRaf = requestAnimationFrame(() => {
    compareRaf = 0
    updateCompareAfterFromForeground()
  })
}

function updateCompareAfterFromForeground() {
  const fc = state.foregroundCanvas
  if (!fc) return
  fc.toBlob((blob) => {
    if (!blob) return
    if (compareAfterObjectUrl) URL.revokeObjectURL(compareAfterObjectUrl)
    compareAfterObjectUrl = URL.createObjectURL(blob)
    els.compareAfter.src = compareAfterObjectUrl
    els.compareAfter.alt = 'Cutout after background removal'
  }, 'image/png')
}

/**
 * @param {Blob} blob
 */
async function loadBlobIntoForeground(blob) {
  /** @type {ImageBitmap | null} */
  let bitmap = null

  if (typeof createImageBitmap === 'function') {
    try {
      bitmap = await createImageBitmap(blob, {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
      })
    } catch {
      bitmap = null
    }
  }

  let w = 0
  let h = 0
  /** @type {HTMLImageElement | null} */
  let img = null

  if (bitmap) {
    w = bitmap.width
    h = bitmap.height
  } else {
    img = new Image()
    const url = URL.createObjectURL(blob)
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    URL.revokeObjectURL(url)
    w = img.naturalWidth
    h = img.naturalHeight
  }

  let fc = state.foregroundCanvas
  if (!fc || fc.width !== w || fc.height !== h) {
    fc = document.createElement('canvas')
    fc.width = w
    fc.height = h
    state.setForegroundCanvas(fc)
  }
  const ctx = fc.getContext('2d', { alpha: true })
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1

  if (bitmap) {
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
  } else if (img) {
    ctx.drawImage(img, 0, 0)
  }

  const imageData = ctx.getImageData(0, 0, w, h)
  decontaminateWhiteMatte(imageData)
  ctx.putImageData(imageData, 0, 0)
  const alpha = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    alpha[i] = imageData.data[i * 4 + 3]
  }
  state.setInitialAlpha(alpha)
}

function attachBrushIfNeeded() {
  if (detachBrush) detachBrush()
  detachBrush = null
  const fc = state.foregroundCanvas
  const ia = state.initialAlpha
  if (!fc || !ia) return

  detachBrush = attachBrushEditor(
    els.canvasResult,
    fc,
    ia,
    redraw,
    () => state.brushMode,
    () => state.brushSize,
  )
}

/**
 * @param {{ file: File, originalUrl: string, processedBlob: Blob, name: string }} item
 */
async function showItem(item) {
  await loadBlobIntoForeground(item.processedBlob)
  els.imgOriginal.src = item.originalUrl
  els.imgOriginal.alt = `Original: ${item.name}`
  els.compareBefore.src = item.originalUrl
  els.compareBefore.alt = 'Before'
  redraw()
  updateCompareAfterFromForeground()
  attachBrushIfNeeded()
}

function updateBatchUi() {
  const items = state.batchItems
  const n = items.length
  if (els.batchCount) els.batchCount.textContent = `${n} image${n === 1 ? '' : 's'}`
  els.batchToolbar?.classList.toggle('d-none', n === 0)
  els.thumbnailStrip?.classList.toggle('d-none', n <= 1)

  if (!els.thumbnailStrip) return
  els.thumbnailStrip.innerHTML = ''
  items.forEach((item, index) => {
    const col = document.createElement('div')
    col.className = 'col-6 col-sm-4 col-md-3 col-lg-2'
    const card = document.createElement('div')
    card.className =
      'thumb-card card border-0 shadow-sm overflow-hidden h-100' +
      (index === state.currentIndex ? ' active' : '')
    card.innerHTML = `<img src="${item.originalUrl}" class="w-100" alt="" />`
    card.addEventListener('click', async () => {
      state.setCurrentIndex(index)
      document.querySelectorAll('.thumb-card').forEach((c) => c.classList.remove('active'))
      card.classList.add('active')
      await showItem(state.batchItems[index])
    })
    col.appendChild(card)
    els.thumbnailStrip.appendChild(col)
  })
}

/**
 * @param {File[]} files
 * @param {{ append?: boolean }} [opts]
 */
async function processFiles(files, opts = {}) {
  const append = Boolean(opts.append && state.batchItems.length > 0)
  const valid = filterValidFiles(files)
  if (!valid.length) {
    showToast('Please choose JPG, PNG, or WEBP images only.', 'danger')
    return
  }

  /** @type {{ file: File, originalUrl: string, processedBlob: Blob, name: string }[]} */
  const items = valid.map((file) => ({
    file,
    originalUrl: URL.createObjectURL(file),
    processedBlob: /** @type {Blob} */ (/** @type {unknown} */ (null)),
    name: file.name,
  }))

  if (!append) {
    state.batchItems.forEach((i) => URL.revokeObjectURL(i.originalUrl))
    if (compareAfterObjectUrl) {
      URL.revokeObjectURL(compareAfterObjectUrl)
      compareAfterObjectUrl = null
    }
  }

  startPreload()
  if (els.batchProgressBar) {
    els.batchProgressBar.style.width = '0%'
    els.batchProgressBar.setAttribute('aria-valuenow', '0')
  }
  setProcessing(true, true)
  els.processingLabel &&
    (els.processingLabel.textContent = append
      ? `Adding ${items.length} image${items.length === 1 ? '' : 's'}…`
      : 'Removing backgrounds…')
  els.processingSub && (els.processingSub.textContent = 'Loading AI models on first run may take a minute.')
  els.processingProgress && (els.processingProgress.style.width = '0%')

  let lastKey = ''
  try {
    await runSequential(
      items,
      async (item) => {
        els.processingLabel && (els.processingLabel.textContent = `Processing ${item.name}…`)
        const blob = await removeImageBackground(item.file, (key, current, total) => {
          lastKey = key
          const pct = total > 0 ? Math.round((current / total) * 100) : 0
          els.processingProgress && (els.processingProgress.style.width = `${pct}%`)
          els.processingSub &&
            (els.processingSub.textContent = `${key}: ${current} / ${total}`)
        })
        item.processedBlob = blob
      },
      (done, total) => {
        const batchPct = Math.round((done / total) * 100)
        if (els.batchProgressBar) {
          els.batchProgressBar.style.width = `${batchPct}%`
          els.batchProgressBar.setAttribute('aria-valuenow', String(batchPct))
        }
      },
    )
  } catch (e) {
    console.error(e)
    showToast(
      'Background removal failed. Try a smaller image or reload the page. ' +
        (e instanceof Error ? e.message : ''),
      'danger',
    )
    items.forEach((i) => URL.revokeObjectURL(i.originalUrl))
    setProcessing(false, false)
    return
  }

  if (append) {
    state.appendBatchItems(items)
    updateBatchUi()
    showToast(`Added ${items.length} image${items.length === 1 ? '' : 's'} to your batch.`, 'success')
  } else {
    state.setBatchItems(items)
    updateBatchUi()
    await showItem(items[0])
    document.querySelectorAll('.thumb-card').forEach((c, i) => {
      c.classList.toggle('active', i === 0)
    })
  }

  els.resultPanel?.classList.remove('d-none')
  setNavDownloadEnabled(true)
  setProcessing(false, false)
}

function wireUpload() {
  bindDropZone(els.dropZone, (fileList) => processFiles(fileList, { append: false }))

  els.dropZone.addEventListener('click', () => {
    fileInputPurpose = 'replace'
    els.fileInput.click()
  })
  els.fileInput.addEventListener('change', () => {
    if (!els.fileInput.files?.length) return
    const append = fileInputPurpose === 'append'
    fileInputPurpose = 'replace'
    processFiles(Array.from(els.fileInput.files), { append })
    els.fileInput.value = ''
  })

  els.btnNavUpload?.addEventListener('click', () => {
    fileInputPurpose = 'replace'
    els.fileInput.click()
  })

  els.btnHeroUpload?.addEventListener('click', () => {
    fileInputPurpose = 'replace'
    els.fileInput.click()
  })

  els.btnAddToBatch?.addEventListener('click', () => {
    fileInputPurpose = 'append'
    els.fileInput.click()
  })
}

function wireBackgroundControls() {
  const modes = ['transparent', 'solid', 'gradient', 'image']
  modes.forEach((m) => {
    const el = document.getElementById(
      m === 'transparent'
        ? 'bg-transparent'
        : m === 'solid'
          ? 'bg-solid'
          : m === 'gradient'
            ? 'bg-gradient'
            : 'bg-image',
    )
    el?.addEventListener('change', () => {
      if (!(/** @type {HTMLInputElement} */ (el)).checked) return
      state.setBgMode(/** @type {'transparent' | 'solid' | 'gradient' | 'image'} */ (m))
      document.getElementById('bg-solid-controls')?.classList.toggle('d-none', m !== 'solid')
      document.getElementById('bg-gradient-controls')?.classList.toggle('d-none', m !== 'gradient')
      document.getElementById('bg-image-controls')?.classList.toggle('d-none', m !== 'image')
      redraw()
    })
  })

  const colorEl = /** @type {HTMLInputElement} */ (document.getElementById('bg-color'))
  colorEl?.addEventListener('input', () => {
    state.setBgSolid(colorEl.value)
    redraw()
  })

  const gradEl = /** @type {HTMLSelectElement} */ (document.getElementById('bg-gradient-preset'))
  gradEl?.addEventListener('change', () => {
    state.setBgGradientPreset(gradEl.value)
    redraw()
  })

  const bgImgInput = /** @type {HTMLInputElement} */ (document.getElementById('bg-image-input'))
  bgImgInput?.addEventListener('change', () => {
    const f = bgImgInput.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      state.setBgImageEl(img)
      redraw()
    }
    img.onerror = () => showToast('Could not load background image.', 'danger')
    img.src = url
  })
}

function wireBrushControls() {
  ;['erase', 'restore'].forEach((mode) => {
    const el = document.getElementById(mode === 'erase' ? 'brush-erase' : 'brush-restore')
    el?.addEventListener('change', () => {
      if ((/** @type {HTMLInputElement} */ (el)).checked) {
        state.setBrushMode(/** @type {'erase' | 'restore'} */ (mode))
      }
    })
  })

  els.brushSize?.addEventListener('input', () => {
    const v = Number(els.brushSize.value)
    state.setBrushSize(v)
    if (els.brushSizeVal) els.brushSizeVal.textContent = String(v)
  })
}

function getExportQuality() {
  const hd = /** @type {HTMLInputElement} */ (document.getElementById('export-hd'))
  return hd?.checked ? 'hd' : 'compressed'
}

function wireStudioAnchorFocus() {
  document.querySelector('a[href="#studio-tool-refine"]')?.addEventListener('click', () => {
    requestAnimationFrame(() => {
      document.getElementById('studio-tool-refine')?.focus({ preventScroll: true })
    })
  })
}

function wireExport() {
  const doDownload = () => {
    const item = state.getCurrentItem()
    if (!item || !state.foregroundCanvas) {
      showToast('Nothing to download yet.', 'info')
      return
    }
    const base = item.name.replace(/\.[^.]+$/, '') || 'image'
    const filename = `${base}-clearcut.png`
    downloadCanvasPng(els.canvasResult, filename, getExportQuality())
  }

  els.btnDownloadMain?.addEventListener('click', doDownload)
  els.btnNavDownload?.addEventListener('click', doDownload)
}

function wireCompare() {
  const wrap = document.getElementById('compare-wrap')
  initCompareSlider(els.compareRange, els.compareBeforeClip, wrap)
}

function wirePreloadProgress() {
  window.addEventListener('bg-remove-preload', (e) => {
    const ev = /** @type {CustomEvent} */ (e)
    const { key, current, total } = ev.detail || {}
    if (els.processingSub && total) {
      els.processingSub.textContent = `Preparing models: ${key} (${current}/${total})`
    }
  })
}

initTheme()
wireUpload()
wireBackgroundControls()
wireBrushControls()
wireExport()
wireStudioAnchorFocus()
wireCompare()
wirePreloadProgress()

// Navbar brand: focus file input
document.querySelector('.navbar-brand')?.addEventListener('click', (e) => {
  e.preventDefault()
  els.fileInput?.click()
})
