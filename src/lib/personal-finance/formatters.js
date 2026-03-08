// Formattazione italiana: 1.234,56 €
export function formatEur(amount) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount ?? 0)
}

// Formattazione numero senza simbolo: 1.234,56
export function formatNumber(amount) {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount ?? 0)
}

// Data italiana: 08/03/2026
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Mese/anno: Mar 2026
export function formatMonth(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + '-01')
  return d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })
}

// Parsa importo da stringa italiana (1.234,56 → 1234.56)
export function parseAmount(str) {
  if (typeof str === 'number') return str
  const cleaned = String(str).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

const MONTH_NAMES = {
  jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
  jul:7, aug:8, sep:9, oct:10, nov:11, dec:12
}

// Parsa data da vari formati Excel/ISO
export function parseDate(str) {
  if (!str) return null
  const s = String(str).trim()

  // formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // formato DD/MM/YYYY o D/M/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/')
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // formato Excel DD-Mon-YY o DD-Mon-YYYY (es. 31-Oct-24, 31-Oct-2024)
  const excelMatch = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/)
  if (excelMatch) {
    const day = excelMatch[1].padStart(2, '0')
    const monthNum = MONTH_NAMES[excelMatch[2].toLowerCase()]
    if (monthNum) {
      let year = parseInt(excelMatch[3])
      if (year < 100) year += year >= 50 ? 1900 : 2000
      return `${year}-${String(monthNum).padStart(2, '0')}-${day}`
    }
  }

  // formato DD/MM/YY
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(s)) {
    const [d, m, y] = s.split('/')
    const year = parseInt(y) >= 50 ? 1900 + parseInt(y) : 2000 + parseInt(y)
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // fallback Date.parse (per formati standard ISO-like)
  const ts = Date.parse(s)
  if (isNaN(ts)) return null
  return new Date(ts).toISOString().slice(0, 10)
}

// Ottieni array di ultimi N mesi in formato YYYY-MM
export function lastNMonths(n = 12) {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    result.push(`${y}-${m}`)
  }
  return result
}
