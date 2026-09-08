/** Bild-Datei clientseitig verkleinern und als JPEG-Blob zurückgeben.
    So bleiben hochgeladene Fotos klein und liegen als eigene Dateien
    neben dem Datenstand, nicht in ihm. */
export async function bildVerkleinern(file: File, maxSize = 384): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  // Weißer Hintergrund, damit transparente PNGs nicht schwarz werden
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht umgewandelt werden'))), 'image/jpeg', 0.85),
  )
}
