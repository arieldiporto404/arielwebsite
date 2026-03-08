'use client'
import { createContext, useContext, useState, useMemo } from 'react'

export const PRESETS = [
  { id: 'last6',     label: 'Ultimi 6 mesi' },
  { id: 'last12',    label: 'Ultimi 12 mesi' },
  { id: 'ytd',       label: "Quest'anno" },
  { id: 'last_year', label: 'Anno scorso' },
  { id: 'all',       label: 'Tutto' },
]

function computeRange(preset) {
  const now = new Date()
  const toDate = (d) => d.toISOString().slice(0, 10)
  const y = now.getFullYear()

  let dateFrom, dateTo

  if (preset === 'ytd') {
    dateFrom = `${y}-01-01`
    dateTo = toDate(now)
  } else if (preset === 'last_year') {
    dateFrom = `${y - 1}-01-01`
    dateTo = `${y - 1}-12-31`
  } else if (preset === 'last6') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 6)
    dateFrom = toDate(d)
    dateTo = toDate(now)
  } else if (preset === 'all') {
    dateFrom = `${y - 6}-01-01`
    dateTo = toDate(now)
  } else {
    // last12 (default)
    const d = new Date(now)
    d.setFullYear(d.getFullYear() - 1)
    dateFrom = toDate(d)
    dateTo = toDate(now)
  }

  // Months array between dateFrom and dateTo
  const months = []
  const [fy, fm] = dateFrom.split('-').map(Number)
  const [ty, tm] = dateTo.split('-').map(Number)
  let cy = fy, cm = fm
  while (cy < ty || (cy === ty && cm <= tm)) {
    months.push(`${cy}-${String(cm).padStart(2, '0')}`)
    cm++
    if (cm > 12) { cm = 1; cy++ }
  }

  return { dateFrom, dateTo, months }
}

const DateRangeContext = createContext(null)

export function DateRangeProvider({ children }) {
  const [preset, setPreset] = useState('last12')
  const range = useMemo(() => computeRange(preset), [preset])

  return (
    <DateRangeContext.Provider value={{ preset, setPreset, ...range }}>
      {children}
    </DateRangeContext.Provider>
  )
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext)
  if (!ctx) throw new Error('useDateRange must be used inside DateRangeProvider')
  return ctx
}
