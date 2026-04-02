/**
 * Client-side background removal via @imgly/background-removal (no upload to a removal API).
 */

import { removeBackground, preload } from '@imgly/background-removal'

let preloadStarted = false

/**
 * Optional warm-up of models (speeds up first removal).
 */
export function startPreload() {
  if (preloadStarted) return
  preloadStarted = true
  preload({
    progress: (key, current, total) => {
      window.dispatchEvent(
        new CustomEvent('bg-remove-preload', {
          detail: { key, current, total },
        }),
      )
    },
  }).catch(() => {
    /* non-fatal */
  })
}

/**
 * @param {Blob | File | ArrayBuffer | ImageData | HTMLImageElement | string | URL} source
 * @param {(key: string, current: number, total: number) => void} [onProgress]
 * @returns {Promise<Blob>}
 */
export async function removeImageBackground(source, onProgress) {
  return removeBackground(source, {
    progress: (key, current, total) => onProgress?.(key, current, total),
    output: {
      format: 'image/png',
      quality: 1,
    },
  })
}
