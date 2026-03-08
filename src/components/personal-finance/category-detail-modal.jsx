'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getCategoryMonthlyData } from '@/lib/personal-finance/queries'
import { formatEur, formatMonth, lastNMonths } from '@/lib/personal-finance/formatters'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

function computeRollingAvg(data, window) {
  return data.map((d, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = data.slice(start, i + 1)
    const avg = slice.reduce((s, x) => s + x.amount, 0) / slice.length
    return { ...d, avg }
  })
}

export default function CategoryDetailModal({ category, dateFrom, dateTo, onClose }) {
  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(true)
  const [rollingWindow, setRollingWindow] = useState('3')
  const [subcategoryId, setSubcategoryId] = useState('')

  const subcategories = category?.pf_subcategories ?? []

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getCategoryMonthlyData(
          category.id,
          dateFrom,
          dateTo,
          subcategoryId || undefined
        )
        setRawData(data)
      } catch {
        toast.error('Errore nel caricamento dati categoria')
      } finally {
        setLoading(false)
      }
    }
    if (category) load()
  }, [category, dateFrom, dateTo, subcategoryId])

  // Aggrega per mese
  const months = lastNMonths(12)
  const monthlyMap = {}
  for (const r of rawData) {
    const month = r.date.slice(0, 7)
    monthlyMap[month] = (monthlyMap[month] || 0) + Number(r.amount)
  }

  const baseData = months.map((m) => ({
    month: formatMonth(m),
    amount: monthlyMap[m] || 0
  }))

  const chartData = computeRollingAvg(baseData, parseInt(rollingWindow))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        {subcategories.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Sottocategoria</label>
            <Select value={subcategoryId} onValueChange={setSubcategoryId}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Tutte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tutte</SelectItem>
                {subcategories.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Media mobile</label>
          <Select value={rollingWindow} onValueChange={setRollingWindow}>
            <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 mesi</SelectItem>
              <SelectItem value="6">6 mesi</SelectItem>
              <SelectItem value="12">12 mesi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">Caricamento...</div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={(v) => formatEur(v).replace(' €', '')}
              />
              <Tooltip
                formatter={(v, name) => [formatEur(v), name === 'amount' ? 'Mese' : `Media ${rollingWindow}m`]}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }}
              />
              <Line type="monotone" dataKey="amount" stroke="#dc2626" strokeWidth={2} dot={false} name="amount" />
              <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="avg" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>Chiudi</Button>
      </div>
    </div>
  )
}
