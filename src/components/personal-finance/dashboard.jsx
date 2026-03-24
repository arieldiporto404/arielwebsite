'use client'
import { useEffect, useState, useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { getKpiTotals, getMonthlyTotals } from '@/lib/personal-finance/queries'
import { formatEur, formatMonth } from '@/lib/personal-finance/formatters'

// ── Design system tokens ──────────────────────────────────────────────────────
const DS = {
  green:  '#16a34a',
  red:    '#dc2626',
  blue:   '#2563eb',
  gray:   '#9ca3af',
}

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESETS = [
  { id: 'last3',     label: 'Ultimi 3 mesi' },
  { id: 'last6',     label: 'Ultimi 6 mesi' },
  { id: 'ytd',       label: "Quest'anno" },
  { id: 'last_year', label: 'Anno scorso' },
]

const pad = (n) => String(n).padStart(2, '0')
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function buildMonths(dateFrom, dateTo) {
  const [fy, fm] = dateFrom.split('-').map(Number)
  const [ty, tm] = dateTo.split('-').map(Number)
  const months = []
  let cy = fy, cm = fm
  while (cy < ty || (cy === ty && cm <= tm)) {
    months.push(`${cy}-${pad(cm)}`)
    cm++; if (cm > 12) { cm = 1; cy++ }
  }
  return months
}

function computeRange(preset) {
  const now = new Date()
  const y = now.getFullYear()
  let dateFrom, dateTo

  if (preset === 'last3') {
    const d = new Date(now); d.setMonth(d.getMonth() - 3)
    dateFrom = toDateStr(d); dateTo = toDateStr(now)
  } else if (preset === 'last6') {
    const d = new Date(now); d.setMonth(d.getMonth() - 6)
    dateFrom = toDateStr(d); dateTo = toDateStr(now)
  } else if (preset === 'ytd') {
    dateFrom = `${y}-01-01`; dateTo = toDateStr(now)
  } else {
    dateFrom = `${y - 1}-01-01`; dateTo = `${y - 1}-12-31`
  }

  return { dateFrom, dateTo, months: buildMonths(dateFrom, dateTo) }
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-md dark:border-gray-200 dark:bg-white">
      <p className="mb-1.5 font-semibold text-gray-700 dark:text-gray-700">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.stroke }} />
          <span className="text-gray-500 dark:text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-900 dark:text-gray-900">{formatEur(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, format, loading }) {
  return (
    <Card className="rounded-xl border-gray-200 bg-white shadow-sm dark:border-gray-200 dark:bg-white dark:text-gray-900">
      <CardHeader className="px-5 pb-1 pt-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-400">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading
          ? <Skeleton className="mt-1 h-8 w-28 dark:bg-gray-200" />
          : <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-900">
              {format(value)}
            </p>
        }
      </CardContent>
    </Card>
  )
}

// ── Pill button ───────────────────────────────────────────────────────────────
function Pill({ active, onClick, children, className }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-gray-900 text-white dark:bg-gray-900 dark:text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-100 dark:text-gray-600 dark:hover:bg-gray-200',
        className
      )}
    >
      {children}
    </button>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [preset, setPreset]           = useState('last_year')
  const [calRange, setCalRange]       = useState({ from: undefined, to: undefined })
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [kpi, setKpi]                 = useState({ totalIncome: 0, totalExpense: 0, savings: 0 })
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading]         = useState(true)

  const { dateFrom, dateTo, months } = useMemo(() => {
    if (preset === 'custom' && calRange.from && calRange.to) {
      const df = toDateStr(calRange.from)
      const dt = toDateStr(calRange.to)
      return { dateFrom: df, dateTo: dt, months: buildMonths(df, dt) }
    }
    return computeRange(preset)
  }, [preset, calRange])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [kpiData, monthlyRaw] = await Promise.all([
          getKpiTotals(dateFrom, dateTo),
          getMonthlyTotals(dateFrom, dateTo),
        ])
        setKpi(kpiData)

        const mMap = {}
        for (const r of monthlyRaw) {
          const m = r.date.slice(0, 7)
          if (!mMap[m]) mMap[m] = { income: 0, expense: 0 }
          mMap[m][r.type] += Number(r.amount)
        }
        setMonthlyData(
          months.map((m) => ({
            month:   formatMonth(m),
            income:  mMap[m]?.income  || 0,
            expense: mMap[m]?.expense || 0,
            savings: (mMap[m]?.income || 0) - (mMap[m]?.expense || 0),
          }))
        )
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dateFrom, dateTo])

  const savingsRate = kpi.totalIncome > 0
    ? Math.round((kpi.savings / kpi.totalIncome) * 100)
    : 0

  const kpiCards = [
    { label: 'Totale Ricavi',      value: kpi.totalIncome,  format: formatEur       },
    { label: 'Totale Costi',       value: kpi.totalExpense, format: formatEur       },
    { label: 'Risparmio',          value: kpi.savings,      format: formatEur       },
    { label: 'Tasso di Risparmio', value: savingsRate,       format: (v) => `${v}%` },
  ]

  const periodLabel = months.length
    ? `${formatMonth(months[0])} — ${formatMonth(months[months.length - 1])}`
    : ''

  const fmtDate = (d) => d ? d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
  const customLabel = preset === 'custom' && calRange.from && calRange.to
    ? `${fmtDate(calRange.from)} → ${fmtDate(calRange.to)}`
    : null

  const axisTick = { fontSize: 11, fill: DS.gray }

  return (
    <div className="p-6 lg:p-8 [color-scheme:light]">

      {/* Header + filtro */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-500">{periodLabel}</p>
        </div>

        {/* Filtro */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <Pill key={p.id} active={preset === p.id} onClick={() => setPreset(p.id)}>
              {p.label}
            </Pill>
          ))}

          {/* Date picker personalizzato */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  preset === 'custom'
                    ? 'bg-gray-900 text-white dark:bg-gray-900 dark:text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-100 dark:text-gray-600 dark:hover:bg-gray-200'
                )}
              >
                <CalendarDays size={12} />
                {customLabel ?? 'Personalizzato'}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto border-gray-200 bg-white p-0 shadow-lg dark:border-gray-200 dark:bg-white"
              align="end"
            >
              <Calendar
                mode="range"
                selected={calRange}
                onSelect={(range) => {
                  setCalRange(range ?? { from: undefined, to: undefined })
                  if (range?.from && range?.to) {
                    setPreset('custom')
                    setPopoverOpen(false)
                  }
                }}
                numberOfMonths={2}
                className="dark:bg-white"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} loading={loading} {...card} />
        ))}
      </div>

      {/* Chart */}
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm dark:border-gray-200 dark:bg-white dark:text-gray-900">
        <Tabs defaultValue="flows">
          <CardHeader className="flex flex-col gap-4 px-5 pt-5 pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-900">
                Andamento
              </CardTitle>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-400">{periodLabel}</p>
            </div>
            <TabsList className="h-8 bg-gray-100 dark:bg-gray-100">
              <TabsTrigger
                value="flows"
                className="h-7 text-xs text-gray-600 dark:text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900"
              >
                Ricavi & Costi
              </TabsTrigger>
              <TabsTrigger
                value="savings"
                className="h-7 text-xs text-gray-600 dark:text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900"
              >
                Risparmio
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="px-2 pb-5 pt-5">
            {/* Ricavi & Costi */}
            <TabsContent value="flows" className="mt-0">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={DS.green} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={DS.green} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={DS.red} stopOpacity={0.12} />
                        <stop offset="95%" stopColor={DS.red} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="income"  name="Ricavi" stroke={DS.green} strokeWidth={2} fill="url(#gIncome)"  dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="expense" name="Costi"  stroke={DS.red}   strokeWidth={2} fill="url(#gExpense)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            {/* Risparmio */}
            <TabsContent value="savings" className="mt-0">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={DS.blue} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={DS.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} domain={['auto', 'auto']} width={36} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="savings" name="Risparmio" stroke={DS.blue} strokeWidth={2} fill="url(#gSavings)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

    </div>
  )
}
