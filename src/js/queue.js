/**
 * Sequential batch processing with aggregate progress.
 */

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T, index: number) => Promise<void>} worker
 * @param {(done: number, total: number) => void} onProgress
 */
export async function runSequential(items, worker, onProgress) {
  const total = items.length
  for (let i = 0; i < total; i++) {
    await worker(items[i], i)
    onProgress(i + 1, total)
  }
}
