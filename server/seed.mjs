// Startbestand aus seed.json (Excel-Stand vom 06.08.2026 plus nachgetragene Belege).
// Wird nur gebraucht, solange im Speicher noch kein Datenstand liegt.
import { readFile } from 'node:fs/promises'

let zaehler = 0
function id() {
  zaehler += 1
  return `seed-${zaehler.toString(36)}`
}

function slug(name) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function seedLaden() {
  const seed = JSON.parse(await readFile(new URL('./seed.json', import.meta.url), 'utf8'))
  const employees = seed.employees.map((e) => ({ ...e }))
  const nachName = new Map(employees.map((e) => [e.name.toLowerCase(), e]))

  const issues = seed.issues.map((si) => {
    let emp = nachName.get(si.employee.toLowerCase())
    if (!emp) {
      emp = { id: slug(si.employee), name: si.employee, active: true, sizes: {} }
      employees.push(emp)
      nachName.set(si.employee.toLowerCase(), emp)
    }
    return {
      id: id(),
      employeeId: emp.id,
      articleId: si.articleId,
      size: si.size,
      qty: si.qty,
      date: si.date ?? seed.seedDate,
      type: 'ausgabe',
      seed: true,
    }
  })

  const orders = seed.orders.map((so) => {
    const status = so.status === 'Geliefert' || so.status === 'Zurückgesendet' ? so.status : 'Bestellt'
    const date = so.date ?? seed.seedDate
    return {
      id: id(),
      articleId: so.articleId,
      size: so.size ?? '?',
      qty: so.qty,
      status,
      orderDate: date,
      deliveryDate: status === 'Geliefert' ? date : undefined,
      // historische Belege gelten als geprueft
      confirmedAt: status === 'Geliefert' ? date : undefined,
      note: so.note,
      seed: true,
    }
  })

  return {
    version: 1,
    articles: seed.articles.map((a) => ({ ...a })),
    employees,
    stock: seed.stock,
    issues,
    orders,
  }
}
