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
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// Calcola saldi mensili dal 2023 in poi partendo dal saldo di fine 2022 (da historical_balances)
function buildWealthTimeline(accounts, transactions, historicalBalances) {
  // Saldo iniziale per ogni conto = initial_balance
  // Per anni pre-2023: usa historical_balances per anno specifico
  // Dal 2023: calcola mese per mese con le transazioni

  // Prima calcola il punto di partenza per il 2023-01
  // = sum di historical_balances per year=2022, oppure sum di initial_balances se non esiste
  const hbByAccountYear = {}
  for (const hb of historicalBalances) {
    hbByAccountYear[`${hb.account_id}-${hb.year}`] = Number(hb.balance)
  }

  // Saldo di partenza per ogni conto (fine 2022 o initial_balance)
  const accountStartBalance = {}
  for (const acc of accounts) {
    const hb2022 = hbByAccountYear[`${acc.id}-2022`]
    accountStartBalance[acc.id] = hb2022 !== undefined ? hb2022 : Number(acc.initial_balance)
  }

  // Calcola variazioni mensili dal 2023
  const txByMonth = {}
  for (const tx of transactions) {
    const month = tx.date.slice(0, 7)
    if (!txByMonth[month]) txByMonth[month] = []
    txByMonth[month].push(tx)
  }

  // Genera tutti i mesi dal 2023-01 a oggi
  const now = new Date()
  const months = []
  let d = new Date(2023, 0, 1)
  while (d <= now) {
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push(m)
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  }

  // Running balances per conto
  const balances = { ...accountStartBalance }
  const timeline = []

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
        if (tx.to_account_id) balances[tx.to_account_id] = (balances[tx.to_account_id] || 0) + amt
      }
    }
    const total = Object.values(balances).reduce((s, v) => s + v, 0)
    timeline.push({ month: formatMonth(month), total })
  }

  // Anni storici pre-2023
  const yearsWithData = new Set()
  for (const hb of historicalBalances) {
    yearsWithData.add(hb.year)
  }
  const historicalPoints = []
  for (const year of Array.from(yearsWithData).sort()) {
    if (year < 2023) {
      const total = historicalBalances
        .filter((hb) => hb.year === year)
        .reduce((s, hb) => s + Number(hb.balance), 0)
      historicalPoints.push({ month: `Fine ${year}`, total })
    }
  }

  return [...historicalPoints, ...timeline]
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

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
      const timeline = buildWealthTimeline(
        wealthRaw.accounts,
        wealthRaw.transactions,
        hbs
      )
      setChartData(timeline)
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

  const currentWealth = chartData.length > 0 ? chartData[chartData.length - 1]?.total : 0

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Patrimonio</h1>
          <p className="mt-1 text-sm text-gray-500">Evoluzione nel tempo</p>
        </div>
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus size={16} className="mr-1.5" /> Aggiungi saldo storico
        </Button>
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
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">Caricamento...</div>
      ) : (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold tracking-tight text-gray-900">Evoluzione patrimonio</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) => [formatEur(v), 'Patrimonio']}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  fill="#2563eb"
                  stroke="#2563eb"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name="Patrimonio"
                />
              </AreaChart>
            </ResponsiveContainer>
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
