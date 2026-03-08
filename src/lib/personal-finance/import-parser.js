import { parseDate, parseAmount } from './formatters'

// Parsa testo TSV (copia-incolla da Excel) in array di righe
function parseTSV(text) {
  const lines = text.trim().split(/\r?\n/)
  return lines.map((line) => line.split('\t').map((cell) => cell.trim()))
}

// Normalizza nome colonna
function normalizeHeader(h) {
  return h.toUpperCase().trim()
}

function buildHeaderMap(headers) {
  const map = {}
  headers.forEach((h, i) => {
    map[normalizeHeader(h)] = i
  })
  return map
}

function get(row, map, key) {
  const idx = map[key]
  return idx !== undefined ? row[idx] ?? '' : ''
}

// Parsa entrate
// Colonne: DATE, MONTH(ignorata), CATEGORY, DESCRIPTION, AMOUNT, ACCOUNT
export function parseIncomeRows(text, categories, accounts) {
  const rows = parseTSV(text)
  if (rows.length < 2) return { valid: [], errors: ['Nessun dato trovato'] }

  const headerMap = buildHeaderMap(rows[0])
  const catMap = Object.fromEntries(
    categories.filter((c) => c.type === 'income').map((c) => [c.name.toLowerCase(), c.id])
  )
  const accMap = Object.fromEntries(accounts.map((a) => [a.name.toLowerCase(), a.id]))

  const valid = []
  const errors = []
  let lastCategoryStr = ''
  let lastAccountStr = ''

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.every((c) => !c)) continue // riga vuota

    // Controlla importo prima di tutto: righe a zero ignorate silenziosamente
    const amountStr = get(row, headerMap, 'AMOUNT')
    const amount = parseAmount(amountStr)
    if (isNaN(amount)) { errors.push(`Riga ${i + 1}: importo non valido "${amountStr}"`); continue }
    if (amount === 0) continue

    const dateStr = get(row, headerMap, 'DATE')
    const rawCategory = get(row, headerMap, 'CATEGORY')
    const rawAccount = get(row, headerMap, 'ACCOUNT')
    // fill-down: se la cella è vuota usa l'ultimo valore visto (celle unite in Excel)
    const categoryStr = rawCategory || lastCategoryStr
    const accountStr = rawAccount || lastAccountStr
    if (rawCategory) lastCategoryStr = rawCategory
    if (rawAccount) lastAccountStr = rawAccount

    const description = get(row, headerMap, 'DESCRIPTION')

    const rowNum = i + 1
    const date = parseDate(dateStr)
    if (!date) { errors.push(`Riga ${rowNum}: data non valida "${dateStr}"`); continue }

    const categoryId = catMap[categoryStr.toLowerCase()]
    if (!categoryId) { errors.push(`Riga ${rowNum}: categoria non trovata "${categoryStr}"`); continue }

    const accountId = accMap[accountStr.toLowerCase()]
    if (!accountId) { errors.push(`Riga ${rowNum}: conto non trovato "${accountStr}"`); continue }

    valid.push({ date, type: 'income', category_id: categoryId, description, amount, account_id: accountId })
  }

  return { valid, errors }
}

// Parsa uscite
// Colonne: DATE, MONTH(ignorata), CATEGORY, DETAILS, DESCRIPTION, AMOUNT, ACCOUNT
export function parseExpenseRows(text, categories, accounts) {
  const rows = parseTSV(text)
  if (rows.length < 2) return { valid: [], errors: ['Nessun dato trovato'] }

  const headerMap = buildHeaderMap(rows[0])
  const expCats = categories.filter((c) => c.type === 'expense')
  const catMap = Object.fromEntries(expCats.map((c) => [c.name.toLowerCase(), c]))
  const accMap = Object.fromEntries(accounts.map((a) => [a.name.toLowerCase(), a.id]))

  // Mappa sottocategorie: nome.toLowerCase() → { id, category_id }
  const subMap = {}
  for (const cat of expCats) {
    for (const sub of cat.pf_subcategories || []) {
      subMap[sub.name.toLowerCase()] = { id: sub.id, category_id: cat.id }
    }
  }

  const valid = []
  const errors = []
  let lastCategoryStr = ''
  let lastAccountStr = ''

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.every((c) => !c)) continue

    // Controlla importo prima di tutto: righe a zero ignorate silenziosamente
    const amountStr = get(row, headerMap, 'AMOUNT')
    const amount = parseAmount(amountStr)
    if (isNaN(amount)) { errors.push(`Riga ${i + 1}: importo non valido "${amountStr}"`); continue }
    if (amount === 0) continue

    const dateStr = get(row, headerMap, 'DATE')
    const rawCategory = get(row, headerMap, 'CATEGORY')
    const rawAccount = get(row, headerMap, 'ACCOUNT')
    // fill-down: se la cella è vuota usa l'ultimo valore visto (celle unite Excel)
    const categoryStr = rawCategory || lastCategoryStr
    const accountStr = rawAccount || lastAccountStr
    if (rawCategory) lastCategoryStr = rawCategory
    if (rawAccount) lastAccountStr = rawAccount

    const detailsStr = get(row, headerMap, 'DETAILS')
    const description = get(row, headerMap, 'DESCRIPTION')

    const rowNum = i + 1
    const date = parseDate(dateStr)
    if (!date) { errors.push(`Riga ${rowNum}: data non valida "${dateStr}"`); continue }

    const cat = catMap[categoryStr.toLowerCase()]
    if (!cat) { errors.push(`Riga ${rowNum}: categoria non trovata "${categoryStr}"`); continue }

    const accountId = accMap[accountStr.toLowerCase()]
    if (!accountId) { errors.push(`Riga ${rowNum}: conto non trovato "${accountStr}"`); continue }

    // Sottocategoria opzionale
    let subcategoryId = null
    if (detailsStr) {
      const sub = subMap[detailsStr.toLowerCase()]
      if (sub) {
        subcategoryId = sub.id
      } else {
        errors.push(`Riga ${rowNum}: sottocategoria non trovata "${detailsStr}" (importata senza sottocategoria)`)
      }
    }

    valid.push({
      date,
      type: 'expense',
      category_id: cat.id,
      subcategory_id: subcategoryId,
      description,
      amount,
      account_id: accountId
    })
  }

  return { valid, errors }
}

// Parsa trasferimenti
// Colonne: DATE, MONTH(ignorata), FROM, TO, DESCRIPTION, AMOUNT
export function parseTransferRows(text, accounts) {
  const rows = parseTSV(text)
  if (rows.length < 2) return { valid: [], errors: ['Nessun dato trovato'] }

  const headerMap = buildHeaderMap(rows[0])
  const accMap = Object.fromEntries(accounts.map((a) => [a.name.toLowerCase(), a.id]))

  const valid = []
  const errors = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.every((c) => !c)) continue

    // Controlla importo prima di tutto: righe a zero ignorate silenziosamente
    const amountStr = get(row, headerMap, 'AMOUNT')
    const amount = parseAmount(amountStr)
    if (isNaN(amount)) { errors.push(`Riga ${i + 1}: importo non valido "${amountStr}"`); continue }
    if (amount === 0) continue

    const dateStr = get(row, headerMap, 'DATE')
    const fromStr = get(row, headerMap, 'FROM')
    const toStr = get(row, headerMap, 'TO')
    const description = get(row, headerMap, 'DESCRIPTION')

    const rowNum = i + 1
    const date = parseDate(dateStr)
    if (!date) { errors.push(`Riga ${rowNum}: data non valida "${dateStr}"`); continue }

    const fromAccountId = accMap[fromStr.toLowerCase()]
    if (!fromAccountId) { errors.push(`Riga ${rowNum}: conto FROM non trovato "${fromStr}"`); continue }

    const toAccountId = accMap[toStr.toLowerCase()]
    if (!toAccountId) { errors.push(`Riga ${rowNum}: conto TO non trovato "${toStr}"`); continue }

    valid.push({
      date,
      type: 'transfer',
      description,
      amount,
      from_account_id: fromAccountId,
      to_account_id: toAccountId
    })
  }

  return { valid, errors }
}
