'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  getKpiTotals, getTotalWealth, getMonthlyTotals,
  getExpensesByCategory, getPivotData, getCategories
} from '@/lib/personal-finance/queries'
import { formatEur, formatMonth } from '@/lib/personal-finance/formatters'
import { useDateRange } from '@/lib/personal-finance/date-range-context'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import CategoryDetailModal from './category-detail-modal'

// -------- Colors --------
const C_INCOME = '#16a34a'
const C_EXPENSE = '#dc2626'
const C_SAVINGS = '#2563eb'

const PIE_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
  '#ca8a04', '#16a34a', '#0891b2', '#9ca3af'
]

// -------- KPI Card --------
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold tracking-tight ${color ?? 'text-gray-900'}`}>
        {formatEur(value)}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// -------- Pivot Table --------
function SortTh({ label, sortKey, active, dir, onSort, align = 'right', sticky = false }) {
  const Icon = active ? (dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <th
      className={`px-2 py-2 font-semibold text-gray-500 whitespace-nowrap cursor-pointer select-none hover:text-gray-800 ${align === 'left' ? 'text-left' : 'text-right'} ${sticky ? 'sticky left-0 bg-white px-4' : ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span className={`inline-flex items-center gap-0.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <Icon size={11} className={active ? 'text-gray-700' : 'text-gray-300'} />
      </span>
    </th>
  )
}

function PivotTable({ title, data, months, showExIncomeTaxes, onCategoryClick }) {
  const [sortKey, setSortKey] = useState('total')
  const [sortDir, setSortDir] = useState('desc')

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const rowTotal = (row) => Object.values(row.monthly).reduce((s, v) => s + v, 0)

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let av, bv
      if (sortKey === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase() }
      else if (sortKey === 'total') { av = rowTotal(a); bv = rowTotal(b) }
      else { av = a.monthly[sortKey] || 0; bv = b.monthly[sortKey] || 0 }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortKey, sortDir])

  const totals = months.map((m) => data.reduce((s, row) => s + (row.monthly[m] || 0), 0))
  const grandTotal = totals.reduce((s, v) => s + v, 0)

  let exTaxTotals = null
  if (showExIncomeTaxes) {
    exTaxTotals = months.map((m) =>
      data.filter((row) => row.name !== 'Taxes').reduce((s, row) => s + (row.monthly[m] || 0), 0)
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-auto shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="font-semibold tracking-tight text-gray-900">{title}</h3>
      </div>
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <SortTh label="Categoria" sortKey="name" active={sortKey === 'name'} dir={sortDir} onSort={handleSort} align="left" sticky />
            {months.map((m) => (
              <SortTh key={m} label={formatMonth(m)} sortKey={m} active={sortKey === m} dir={sortDir} onSort={handleSort} />
            ))}
            <SortTh label="Totale" sortKey="total" active={sortKey === 'total'} dir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => onCategoryClick(row)}>
              <td className="sticky left-0 bg-white px-4 py-1.5 font-medium text-gray-700">{row.name}</td>
              {months.map((m) => (
                <td key={m} className={`px-2 py-1.5 text-right font-mono text-gray-600 ${sortKey === m ? 'bg-blue-50/40' : ''}`}>
                  {row.monthly[m] ? formatEur(row.monthly[m]) : '—'}
                </td>
              ))}
              <td className={`px-4 py-1.5 text-right font-mono font-semibold text-gray-700 ${sortKey === 'total' ? 'bg-blue-50/40' : ''}`}>
                {formatEur(rowTotal(row))}
              </td>
            </tr>
          ))}
          <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
            <td className="sticky left-0 bg-gray-50 px-4 py-2 text-gray-900">Totale</td>
            {totals.map((t, i) => (
              <td key={i} className="px-2 py-2 text-right font-mono text-gray-900">{t ? formatEur(t) : '—'}</td>
            ))}
            <td className="px-4 py-2 text-right font-mono text-gray-900">{formatEur(grandTotal)}</td>
          </tr>
          {showExIncomeTaxes && exTaxTotals && (
            <tr className="border-t border-gray-100 bg-orange-50">
              <td className="sticky left-0 bg-orange-50 px-4 py-1.5 text-xs font-semibold text-orange-700">
                Expenses (Ex Income Taxes)
              </td>
              {exTaxTotals.map((t, i) => (
                <td key={i} className="px-2 py-1.5 text-right font-mono text-xs text-orange-700">{t ? formatEur(t) : '—'}</td>
              ))}
              <td className="px-4 py-1.5 text-right font-mono text-xs font-semibold text-orange-700">
                {formatEur(exTaxTotals.reduce((s, v) => s + v, 0))}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// -------- Main Dashboard --------
export default function Dashboard() {
  const { dateFrom, dateTo, months } = useDateRange()

  const [kpi, setKpi] = useState({ totalIncome: 0, totalExpense: 0, savings: 0 })
  const [wealth, setWealth] = useState(0)
  const [monthlyData, setMonthlyData] = useState([])
  const [pieData, setPieData] = useState([])
  const [incomePivot, setIncomePivot] = useState([])
  const [expensePivot, setExpensePivot] = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [kpiData, wealthData, monthlyRaw, pieRaw, incomePivotRaw, expensePivotRaw, cats] = await Promise.all([
          getKpiTotals(dateFrom, dateTo),
          getTotalWealth(),
          getMonthlyTotals(dateFrom, dateTo),
          getExpensesByCategory(dateFrom, dateTo),
          getPivotData('income', dateFrom, dateTo),
          getPivotData('expense', dateFrom, dateTo),
          getCategories()
        ])

        setKpi(kpiData)
        setWealth(wealthData)
        setAllCategories(cats)

        // Monthly chart data
        const mMap = {}
        for (const r of monthlyRaw) {
          const m = r.date.slice(0, 7)
          if (!mMap[m]) mMap[m] = { income: 0, expense: 0 }
          mMap[m][r.type] += Number(r.amount)
        }
        setMonthlyData(
          months.map((m) => ({
            month: formatMonth(m),
            income: mMap[m]?.income || 0,
            expense: mMap[m]?.expense || 0,
            savings: (mMap[m]?.income || 0) - (mMap[m]?.expense || 0)
          }))
        )

        // Pie
        setPieData(pieRaw.slice(0, 8))

        // Pivot helpers
        function buildPivot(rows) {
          const catMap = {}
          for (const r of rows) {
            const id = r.category_id
            const name = r.pf_categories?.name ?? 'Altro'
            if (!catMap[id]) catMap[id] = { id, name, monthly: {} }
            const m = r.date.slice(0, 7)
            catMap[id].monthly[m] = (catMap[id].monthly[m] || 0) + Number(r.amount)
          }
          return Object.values(catMap).sort((a, b) =>
            Object.values(b.monthly).reduce((s, v) => s + v, 0) -
            Object.values(a.monthly).reduce((s, v) => s + v, 0)
          )
        }

        setIncomePivot(buildPivot(incomePivotRaw))
        setExpensePivot(buildPivot(expensePivotRaw))
      } catch (err) {
        toast.error('Errore nel caricamento dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dateFrom, dateTo])

  // Savings rate chart — % risparmiato sui ricavi (100% = tutto risparmiato)
  const savingsRateData = monthlyData.map((d) => {
    const savingsPct = d.income > 0 ? Math.round((d.savings / d.income) * 100) : 0
    return { month: d.month, Risparmio: savingsPct }
  })

  function handleCategoryClick(row) {
    const cat = allCategories.find((c) => c.id === row.id)
    if (cat) setSelectedCategory(cat)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-sm text-gray-400">Caricamento...</div>
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">{formatMonth(months[0])} → {formatMonth(months[months.length - 1])}</p>
      </div>

      {/* KPI */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Entrate" value={kpi.totalIncome} color="text-green-600" />
        <KpiCard label="Uscite" value={kpi.totalExpense} color="text-red-500" />
        <KpiCard label="Risparmio" value={kpi.savings} color={kpi.savings >= 0 ? 'text-blue-600' : 'text-red-500'} />
        <KpiCard label="Patrimonio" value={wealth} />
      </div>

      {/* Charts row 1 */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Entrate vs Uscite */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold tracking-tight text-gray-900">Entrate vs Uscite</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v) => formatEur(v)}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }}
                />
                <Area type="monotone" dataKey="income" stackId="1" fill={C_INCOME} stroke={C_INCOME} fillOpacity={0.2} name="Entrate" />
                <Area type="monotone" dataKey="expense" stackId="2" fill={C_EXPENSE} stroke={C_EXPENSE} fillOpacity={0.2} name="Uscite" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tasso risparmio */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold tracking-tight text-gray-900">Tasso di Risparmio (%)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={savingsRateData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis domain={['auto', 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip
                  formatter={(v) => `${v}%`}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }}
                />
                <Area type="monotone" dataKey="Risparmio" fill={C_SAVINGS} stroke={C_SAVINGS} fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pie + Charts row 2 */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Donut Spese */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold tracking-tight text-gray-900">Breakdown Uscite</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="total"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.id} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [formatEur(v), name]}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }}
                />
                <Legend
                  formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risparmio mensile bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 font-semibold tracking-tight text-gray-900">Risparmio mensile</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v) => formatEur(v)}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="savings" name="Risparmio" radius={[3, 3, 0, 0]}>
                  {monthlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.savings >= 0 ? C_SAVINGS : C_EXPENSE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pivot tables */}
      <div className="mb-4 flex flex-col gap-4">
        <PivotTable
          title="Entrate per categoria"
          data={incomePivot}
          months={months}
          showExIncomeTaxes={false}
          onCategoryClick={handleCategoryClick}
        />
        <PivotTable
          title="Uscite per categoria"
          data={expensePivot}
          months={months}
          showExIncomeTaxes={true}
          onCategoryClick={handleCategoryClick}
        />
      </div>

      {/* Recap risparmio mensile */}
      {(() => {
        const taxesRow = expensePivot.find((r) => r.name === 'Taxes')
        const netMonthly = monthlyData.map((d, i) => {
          const taxes = taxesRow?.monthly[months[i]] || 0
          return { ...d, taxes, netIncome: d.income - taxes }
        })
        const totNetIncome = netMonthly.reduce((s, d) => s + d.netIncome, 0)
        const totSavings = netMonthly.reduce((s, d) => s + d.savings, 0)
        const totNetPct = totNetIncome > 0 ? Math.round((totSavings / totNetIncome) * 100) : 0

        return (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white overflow-auto shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="font-semibold tracking-tight text-gray-900">Recap mensile risparmio</h3>
            </div>
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 bg-white px-4 py-2 text-left font-semibold text-gray-500">Voce</th>
                  {netMonthly.map((d) => (
                    <th key={d.month} className="px-2 py-2 text-right font-semibold text-gray-500 whitespace-nowrap">{d.month}</th>
                  ))}
                  <th className="px-4 py-2 text-right font-semibold text-gray-500">Totale</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-1.5 font-medium text-gray-700">Entrate</td>
                  {netMonthly.map((d) => (
                    <td key={d.month} className="px-2 py-1.5 text-right font-mono text-gray-600">{formatEur(d.income)}</td>
                  ))}
                  <td className="px-4 py-1.5 text-right font-mono font-semibold text-gray-700">
                    {formatEur(netMonthly.reduce((s, d) => s + d.income, 0))}
                  </td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-1.5 font-medium text-orange-700">Entrate Nette</td>
                  {netMonthly.map((d) => (
                    <td key={d.month} className="px-2 py-1.5 text-right font-mono text-orange-700">{formatEur(d.netIncome)}</td>
                  ))}
                  <td className="px-4 py-1.5 text-right font-mono font-semibold text-orange-700">
                    {formatEur(totNetIncome)}
                  </td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-1.5 font-medium text-gray-700">Uscite</td>
                  {netMonthly.map((d) => (
                    <td key={d.month} className="px-2 py-1.5 text-right font-mono text-gray-600">{formatEur(d.expense)}</td>
                  ))}
                  <td className="px-4 py-1.5 text-right font-mono font-semibold text-gray-700">
                    {formatEur(netMonthly.reduce((s, d) => s + d.expense, 0))}
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="sticky left-0 bg-white px-4 py-1.5 font-medium text-gray-700">Risparmio</td>
                  {netMonthly.map((d) => (
                    <td key={d.month} className={`px-2 py-1.5 text-right font-mono font-semibold ${d.savings >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {formatEur(d.savings)}
                    </td>
                  ))}
                  <td className={`px-4 py-1.5 text-right font-mono font-semibold ${totSavings >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {formatEur(totSavings)}
                  </td>
                </tr>
                <tr className="border-b border-gray-50 bg-gray-50">
                  <td className="sticky left-0 bg-gray-50 px-4 py-1.5 font-medium text-gray-500">% sui ricavi</td>
                  {netMonthly.map((d) => {
                    const pct = d.income > 0 ? Math.round((d.savings / d.income) * 100) : 0
                    return (
                      <td key={d.month} className={`px-2 py-1.5 text-right font-mono ${pct >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {pct}%
                      </td>
                    )
                  })}
                  {(() => {
                    const totI = netMonthly.reduce((s, d) => s + d.income, 0)
                    const pct = totI > 0 ? Math.round((totSavings / totI) * 100) : 0
                    return <td className={`px-4 py-1.5 text-right font-mono font-semibold ${pct >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{pct}%</td>
                  })()}
                </tr>
                <tr className="bg-orange-50">
                  <td className="sticky left-0 bg-orange-50 px-4 py-1.5 font-medium text-orange-700">% sui ricavi netti</td>
                  {netMonthly.map((d) => {
                    const pct = d.netIncome > 0 ? Math.round((d.savings / d.netIncome) * 100) : 0
                    return (
                      <td key={d.month} className={`px-2 py-1.5 text-right font-mono font-semibold ${pct >= 0 ? 'text-orange-700' : 'text-red-500'}`}>
                        {pct}%
                      </td>
                    )
                  })}
                  <td className={`px-4 py-1.5 text-right font-mono font-semibold ${totNetPct >= 0 ? 'text-orange-700' : 'text-red-500'}`}>
                    {totNetPct}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* Category detail modal */}
      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCategory?.name} — Analisi mensile</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <CategoryDetailModal
              category={selectedCategory}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onClose={() => setSelectedCategory(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
