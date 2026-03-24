'use client'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import {
  getHistoricalBalances, upsertHistoricalBalance, deleteHistoricalBalance,
  getAccounts, getWealthByMonth
} from '@/lib/personal-finance/queries'
import { formatEur, formatMonth } from '@/lib/personal-finance/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent
} from '@/components/ui/chart'

const ASSET_PALETTE     = ['#2563eb','#16a34a','#d97706','#7c3aed','#0891b2','#be185d','#059669','#b45309','#ea580c','#6366f1']
const LIABILITY_PALETTE = ['#ef4444','#f97316','#eab308','#a855f7','#06b6d4','#ec4899','#84cc16','#78716c']

function tagToKey(tag) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'altro'
}

function buildWealthTimeline(accounts, transactions, historicalBalances) {
  // Mappa account_id → tag per attivi e passivi
  const assetTagMap = {}, liabilityTagMap = {}
  const assetTagsOrder = [], liabilityTagsOrder = []
  const seenAsset = new Set(), seenLiability = new Set()

  for (const acc of accounts) {
    const tag = (acc.tags ?? [])[0] ?? 'Altro'
    if ((acc.account_type ?? 'asset') !== 'liability') {
      assetTagMap[acc.id] = tag
      if (!seenAsset.has(tag)) { seenAsset.add(tag); assetTagsOrder.push(tag) }
    } else {
      liabilityTagMap[acc.id] = tag
      if (!seenLiability.has(tag)) { seenLiability.add(tag); liabilityTagsOrder.push(tag) }
    }
  }

  const assetTagMeta     = assetTagsOrder.map((label, i) => ({ label, key: tagToKey(label),       color: ASSET_PALETTE[i % ASSET_PALETTE.length] }))
  const liabilityTagMeta = liabilityTagsOrder.map((label, i) => ({ label, key: 'l_' + tagToKey(label), color: LIABILITY_PALETTE[i % LIABILITY_PALETTE.length] }))
  const assetLabelToKey     = Object.fromEntries(assetTagMeta.map(t => [t.label, t.key]))
  const liabilityLabelToKey = Object.fromEntries(liabilityTagMeta.map(t => [t.label, t.key]))

  // Raggruppa transazioni per mese
  const txByMonth = {}
  for (const tx of transactions) {
    if (!tx.date) continue
    const month = tx.date.slice(0, 7)
    if (!txByMonth[month]) txByMonth[month] = []
    txByMonth[month].push(tx)
  }

  // Range mesi
  const allMonths = Object.keys(txByMonth).sort()
  const firstMonth = allMonths[0] ?? '2023-01'
  const now = new Date()
  const months = []
  let d = new Date(firstMonth + '-01')
  while (d <= now) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  }

  const balances = {}
  for (const acc of accounts) balances[acc.id] = Number(acc.initial_balance)

  // Punti storici pre-primo mese
  const yearsWithData = new Set()
  for (const hb of historicalBalances) yearsWithData.add(hb.year)
  const historicalPoints = []
  for (const year of Array.from(yearsWithData).sort()) {
    if (`${year}-12` < firstMonth) {
      const total = historicalBalances.filter(hb => hb.year === year).reduce((s, hb) => s + Number(hb.balance), 0)
      historicalPoints.push({ month: `${year}`, total, rawMonth: `${year}-12` })
    }
  }

  // Simulazione forward
  const timeline = []
  const assetTimeline = []
  const liabilityTimeline = []

  for (const month of months) {
    const txs = txByMonth[month] || []
    for (const tx of txs) {
      const amt = Number(tx.amount)
      if (tx.type === 'income' && tx.account_id) {
        balances[tx.account_id] = (balances[tx.account_id] || 0) + amt
      } else if (tx.type === 'expense' && tx.account_id) {
        balances[tx.account_id] = (balances[tx.account_id] || 0) - amt
      } else if (tx.type === 'transfer') {
        if (tx.from_account_id) balances[tx.from_account_id] = (balances[tx.from_account_id] || 0) - amt
        if (tx.to_account_id)   balances[tx.to_account_id]   = (balances[tx.to_account_id]   || 0) + amt
      }
    }

    // Label: solo dicembre → anno, altrimenti mese abbreviato
    const label = month.endsWith('-12') ? month.slice(0, 4) : formatMonth(month)
    const total = Object.values(balances).reduce((s, v) => s + v, 0)
    timeline.push({ month: label, total, rawMonth: month })

    // Asset per tag
    const aRow = { month: label, rawMonth: month }
    for (const [id, bal] of Object.entries(balances)) {
      const tag = assetTagMap[id]
      if (tag && bal > 0) { const key = assetLabelToKey[tag]; aRow[key] = (aRow[key] || 0) + bal }
    }
    assetTimeline.push(aRow)

    // Liability per tag (valori assoluti)
    const lRow = { month: label, rawMonth: month }
    for (const [id, bal] of Object.entries(balances)) {
      const tag = liabilityTagMap[id]
      if (tag && bal < 0) { const key = liabilityLabelToKey[tag]; lRow[key] = (lRow[key] || 0) + Math.abs(bal) }
    }
    liabilityTimeline.push(lRow)
  }

  return {
    timeline: [...historicalPoints, ...timeline],
    assetTimeline, assetTagMeta,
    liabilityTimeline, liabilityTagMeta
  }
}

// -------- Historical Balance Form --------
function HistoricalBalanceForm({ accounts, onSave, onClose }) {
  const [accountId, setAccountId] = useState('')
  const [year, setYear] = useState(new Date().getFullYear() - 1)
  const [balance, setBalance] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!accountId) return toast.error('Seleziona un conto')
    if (!year || year < 2000) return toast.error('Anno non valido')
    const balanceNum = parseFloat(String(balance).replace(',', '.'))
    if (isNaN(balanceNum)) return toast.error('Importo non valido')
    setLoading(true)
    try {
      await onSave({ account_id: accountId, year: parseInt(year), balance: balanceNum })
      onClose()
    } catch (err) {
      toast.error(err.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Conto</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Anno (fine anno)</Label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} min="2000" max="2022" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Saldo di fine anno (€)</Label>
        <Input
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Annulla</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : 'Salva'}</Button>
      </DialogFooter>
    </form>
  )
}

// -------- Main --------
export default function WealthPage() {
  const [accounts, setAccounts] = useState([])
  const [historicalBalances, setHistoricalBalances] = useState([])
  const [chartData, setChartData] = useState([])
  const [assetTimeline, setAssetTimeline] = useState([])
  const [assetTagMeta, setAssetTagMeta] = useState([])
  const [liabilityTimeline, setLiabilityTimeline] = useState([])
  const [liabilityTagMeta, setLiabilityTagMeta] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState('monthly')
  const [fromMonth, setFromMonth] = useState('')
  const [toMonth, setToMonth] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [accs, hbs, wealthRaw] = await Promise.all([
        getAccounts(),
        getHistoricalBalances(),
        getWealthByMonth()
      ])
      setAccounts(accs)
      setHistoricalBalances(hbs)
      const result = buildWealthTimeline(wealthRaw.accounts, wealthRaw.transactions, hbs)
      setChartData(result.timeline)
      setAssetTimeline(result.assetTimeline)
      setAssetTagMeta(result.assetTagMeta)
      setLiabilityTimeline(result.liabilityTimeline)
      setLiabilityTagMeta(result.liabilityTagMeta)
    } catch (err) {
      toast.error('Errore nel caricamento dati patrimonio')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(values) {
    await upsertHistoricalBalance(values)
    toast.success('Saldo storico salvato')
    await load()
  }

  async function handleDelete(id) {
    await deleteHistoricalBalance(id)
    toast.success('Saldo storico eliminato')
    await load()
  }

  // Raggruppa saldi storici per anno
  const byYear = {}
  for (const hb of historicalBalances) {
    if (!byYear[hb.year]) byYear[hb.year] = []
    byYear[hb.year].push(hb)
  }
  const years = Object.keys(byYear).sort()

  const isAnnual = viewMode === 'annual'
  const filterAnnual = (arr) => arr.filter(d => d.rawMonth?.endsWith('-12'))
  const filterRange = (arr) => arr.filter(d => {
    if (fromMonth && d.rawMonth < fromMonth) return false
    if (toMonth && d.rawMonth > toMonth) return false
    return true
  })
  const displayChart       = filterRange(isAnnual ? filterAnnual(chartData)       : chartData)
  const displayAssets      = filterRange(isAnnual ? filterAnnual(assetTimeline)    : assetTimeline)
  const displayLiabilities = filterRange(isAnnual ? filterAnnual(liabilityTimeline) : liabilityTimeline)

  const currentWealth = chartData.length > 0 ? chartData[chartData.length - 1]?.total : 0

  const tableData = [...displayChart].reverse().map(row => {
    const aRow = displayAssets.find(r => r.rawMonth === row.rawMonth) || {}
    const lRow = displayLiabilities.find(r => r.rawMonth === row.rawMonth) || {}
    const assets      = assetTagMeta.reduce((s, t) => s + (aRow[t.key] || 0), 0)
    const liabilities = liabilityTagMeta.reduce((s, t) => s + (lRow[t.key] || 0), 0)
    return { month: row.month, assets, liabilities, netWorth: row.total }
  })

  function StackedChart({ data, tagMeta, title }) {
    const [pct, setPct] = useState(false)
    if (!data.length || !tagMeta.length) return null
    const config = Object.fromEntries(tagMeta.map(({ key, label, color }) => [key, { label, color }]))
    const interval = Math.max(0, Math.floor(data.length / 12) - 1)

    // Dati normalizzati a 100% per ogni riga
    const absData = data
    const pctData = data.map(row => {
      const total = tagMeta.reduce((s, t) => s + (row[t.key] || 0), 0)
      if (!total) return row
      const out = { month: row.month, rawMonth: row.rawMonth }
      for (const { key } of tagMeta) out[key] = ((row[key] || 0) / total) * 100
      return out
    })
    const chartRows = pct ? pctData : absData

    const CustomTooltip = ({ active, payload, label: lbl }) => {
      if (!active || !payload?.length) return null
      const items = payload.filter(p => p.value)
      // Trova la riga originale per i valori assoluti
      const origRow = absData.find(r => r.month === lbl) || {}
      const absTotal = tagMeta.reduce((s, t) => s + (origRow[t.key] || 0), 0)
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md" style={{ fontSize: 12 }}>
          <p className="mb-2 font-semibold text-gray-900">{lbl}</p>
          {items.map((item) => {
            const meta = tagMeta.find(t => t.key === item.dataKey)
            const absVal = origRow[item.dataKey] || 0
            const pctVal = absTotal > 0 ? (absVal / absTotal) * 100 : 0
            return (
              <div key={item.dataKey} className="flex items-center justify-between gap-6 mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: meta?.color || item.fill }} />
                  <span className="text-gray-600">{meta?.label ?? item.dataKey}</span>
                </div>
                <span className="font-mono font-medium text-gray-900">
                  {formatEur(absVal)}<span className="ml-1.5 text-gray-400">{pctVal.toFixed(1)}%</span>
                </span>
              </div>
            )
          })}
          {items.length > 1 && (
            <div className="flex items-center justify-between gap-6 mt-2 border-t border-gray-100 pt-2">
              <span className="font-semibold text-gray-700">Totale</span>
              <span className="font-mono font-semibold text-gray-900">{formatEur(absTotal)}</span>
            </div>
          )}
        </div>
      )
    }
    return (
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold tracking-tight text-gray-900">{title}</h3>
          <div className="flex overflow-hidden rounded-md border border-gray-200 text-xs font-medium">
            <button onClick={() => setPct(false)}
              className={`px-2.5 py-1 ${!pct ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              €
            </button>
            <button onClick={() => setPct(true)}
              className={`px-2.5 py-1 border-l border-gray-200 ${pct ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              %
            </button>
          </div>
        </div>
        <ChartContainer config={config} className="h-72 w-full">
          <BarChart data={chartRows} barCategoryGap="8%" barGap={0} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={interval} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={45}
              domain={pct ? [0, 100] : undefined}
              tickFormatter={(v) => pct ? `${v.toFixed(0)}%` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
            <ChartLegend content={<ChartLegendContent />} />
            {tagMeta.map(({ key }, i) => (
              <Bar key={key} dataKey={key} stackId="s" fill={`var(--color-${key})`}
                radius={i === tagMeta.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Patrimonio</h1>
          <p className="mt-1 text-sm text-gray-500">Evoluzione nel tempo</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-gray-200 text-xs font-medium">
            {['monthly', 'annual'].map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 ${viewMode === m ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} ${m === 'annual' ? 'border-l border-gray-200' : ''}`}>
                {m === 'monthly' ? 'Mensile' : 'Annuale'}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <Plus size={16} className="mr-1.5" /> Aggiungi saldo storico
          </Button>
        </div>
      </div>

      {/* Filtro data */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-gray-500">Periodo:</span>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400">Da</label>
          <input
            type="month"
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400">A</label>
          <input
            type="month"
            value={toMonth}
            onChange={(e) => setToMonth(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
        {(fromMonth || toMonth) && (
          <button
            onClick={() => { setFromMonth(''); setToMonth('') }}
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            Rimuovi filtro
          </button>
        )}
      </div>

      {/* Patrimonio attuale */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Patrimonio attuale</p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-gray-900">
          {formatEur(currentWealth)}
        </p>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex h-72 items-center justify-center text-sm text-gray-400">Caricamento...</div>
      ) : chartData.length === 0 ? (
        <div className="mb-6 flex h-72 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
          Nessun dato disponibile
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold tracking-tight text-gray-900">Evoluzione patrimonio netto</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayChart} margin={{ top: 8, right: 16, left: 8, bottom: 0 }} barCategoryGap="8%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(0, Math.floor(displayChart.length / 12) - 1)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`
                    return v.toFixed(0)
                  }}
                  width={45}
                />
                <Tooltip
                  formatter={(v) => [formatEur(v), 'Patrimonio netto']}
                  labelStyle={{ fontSize: 12, fontWeight: 600, color: '#111827' }}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                  {displayChart.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.total >= 0 ? '#2563eb' : '#dc2626'}
                      fillOpacity={i === displayChart.length - 1 ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stacked asset chart */}
      {!loading && <StackedChart data={displayAssets} tagMeta={assetTagMeta} title="Composizione attivi per categoria" />}

      {/* Stacked liability chart */}
      {!loading && <StackedChart data={displayLiabilities} tagMeta={liabilityTagMeta} title="Composizione debiti per categoria" />}

      {/* Tabella riepilogo */}
      {tableData.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="font-semibold tracking-tight text-gray-900">Riepilogo per periodo</h3>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">Periodo</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-widest text-gray-400">Attivi</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-widest text-gray-400">Debiti</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-widest text-gray-400">Patrimonio netto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tableData.map((row, i) => (
                  <tr key={i} className={i === 0 ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-2.5 font-medium text-gray-700">{row.month}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700">{formatEur(row.assets)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-600">{row.liabilities > 0 ? `- ${formatEur(row.liabilities)}` : '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${row.netWorth >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {formatEur(row.netWorth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Saldi storici */}
      {years.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="font-semibold tracking-tight text-gray-900">Saldi storici (pre-2023)</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {years.map((year) => (
              <div key={year} className="px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Fine {year}
                </p>
                <div className="flex flex-col gap-1.5">
                  {byYear[year].map((hb) => (
                    <div key={hb.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{hb.pf_accounts?.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {formatEur(hb.balance)}
                        </span>
                        <button
                          onClick={() => handleDelete(hb.id)}
                          className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-1.5">
                    <span className="text-xs font-semibold text-gray-400">Totale {year}</span>
                    <span className="font-mono text-xs font-semibold text-gray-600">
                      {formatEur(byYear[year].reduce((s, hb) => s + Number(hb.balance), 0))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi saldo storico</DialogTitle>
            <DialogDescription>
              Inserisci il saldo di un conto a fine anno (per anni precedenti al 2023).
            </DialogDescription>
          </DialogHeader>
          <HistoricalBalanceForm accounts={accounts} onSave={handleSave} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
