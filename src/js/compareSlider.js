/**
 * Before / after comparison slider (clips the "before" layer).
 */

/**
 * @param {HTMLInputElement} rangeEl
 * @param {HTMLElement} clipEl
 * @param {HTMLElement | null} [wrapEl] — optional; updates --compare-pct for the divider line
 */
export function initCompareSlider(rangeEl, clipEl, wrapEl) {
  const update = () => {
    const v = Number(rangeEl.value)
    const right = 100 - v
    clipEl.style.clipPath = `inset(0 ${right}% 0 0)`
    wrapEl?.style.setProperty('--compare-pct', `${v}%`)
  }
  rangeEl.addEventListener('input', update)
  update()
}
