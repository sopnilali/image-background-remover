/**
 * Remove white "matte" from cutout edges. Many matting outputs are composited on white;
 * RGB stays bright where alpha is partial, which looks like a white wash on screen.
 * Reconstructs straight RGBA from Cs = Cf*a + 255*(1-a).
 *
 * @param {ImageData} imageData — mutated in place
 */
export function decontaminateWhiteMatte(imageData) {
  const d = imageData.data
  const eps = 1 / 255
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255
    if (a <= eps) {
      d[i] = 0
      d[i + 1] = 0
      d[i + 2] = 0
      continue
    }
    if (a >= 1 - eps) continue
    for (let c = 0; c < 3; c++) {
      const out = (d[i + c] - 255 * (1 - a)) / a
      d[i + c] = Math.max(0, Math.min(255, out))
    }
  }
}
