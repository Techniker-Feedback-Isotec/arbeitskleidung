/** Kennung aus einem Namen: klein, ohne Umlaute, Bindestriche statt Sonderzeichen */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
