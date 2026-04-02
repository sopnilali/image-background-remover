/**
 * Client-side background removal via @imgly/background-removal (no upload to a removal API).
 */

import { removeBackground } from '@imgly/background-removal'

/** Max-quality inference: full isnet weights (library default is isnet_fp16). */
const REMOVAL_MODEL = 'isnet'

/**
 * Shared options: PNG lossless output, full-res RGB (mask upscaled when rescale is true).
 */
function baseRemovalConfig() {
  return {
    model: REMOVAL_MODEL,
    rescale: true,
    output: {
      format: 'image/png',
      quality: 1,
    },
  }
}

/**
 * Note: Do not call `preload()` before `removeBackground` with a different
 * `progress` handler. The library memoizes `init` with JSON.stringify(config),
 * which drops `progress`, so an early preload would cache a config and your
 * removal progress callback would never run (stuck at 0%).
 */

/**
 * @param {Blob | File | ArrayBuffer | ImageData | HTMLImageElement | string | URL} source
 * @param {(key: string, current: number, total: number) => void} [onProgress]
 * @returns {Promise<Blob>}
 */
export async function removeImageBackground(source, onProgress) {
  return removeBackground(source, {
    ...baseRemovalConfig(),
    progress: (key, current, total) => onProgress?.(key, current, total),
  })
}
