'use client'

import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

// ─── utilities ───────────────────────────────────────────────────────────────

const fmtEur = (v) => {
  if (v == null || isNaN(v)) return '—'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return sign + '€' + (abs / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return sign + '€' + (abs / 1_000).toFixed(0) + 'k'
  return sign + '€' + abs.toFixed(0)
}

const fmtEurFull = (v) => {
  if (v == null || isNaN(v)) return '—'
  const abs = Math.abs(v)
  const formatted = abs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (v < 0 ? '-' : '') + '€ ' + formatted
}

function runProjection(revenue, costs, cash, revenueGrowth, costGrowth, months = 36) {
  const data = []
  let r = revenue
  let c = costs
  let k = cash
  let breakEvenMonth = null
  let deadMonth = null

  for (let m = 1; m <= months; m++) {
    r = r * (1 + revenueGrowth)
    c = c * (1 + costGrowth)
    const cf = r - c
    k = k + cf

    data.push({ month: m, revenue: Math.round(r), costs: Math.round(c), cashFlow: Math.round(cf), cash: Math.round(k) })

    if (breakEvenMonth === null && r >= c) breakEvenMonth = m
    if (deadMonth === null && k <= 0) deadMonth = m

    if (deadMonth !== null || breakEvenMonth !== null) {
      if (deadMonth !== null && breakEvenMonth === null) break
      if (deadMonth !== null && breakEvenMonth !== null) break
    }
  }

  const alive = breakEvenMonth !== null && (deadMonth === null || breakEvenMonth <= deadMonth)
  return { data, breakEvenMonth, deadMonth, alive }
}

// ─── Tailwind tokens ─────────────────────────────────────────────────────────

const LABEL = 'block text-xs font-medium text-gray-500 mb-1'
const INPUT_CLS =
  'h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950'
const INPUT_SM =
  'h-8 w-full rounded-md border border-gray-200 bg-transparent px-2.5 py-1 text-sm shadow-xs transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950'

// ─── sub-components ──────────────────────────────────────────────────────────

function ScenarioResult({ label, result, color, accent }) {
  const text = result.alive
    ? `Alive · mese ${result.breakEvenMonth}`
    : result.deadMonth
      ? `Dead · ${result.deadMonth} ${result.deadMonth === 1 ? 'mese' : 'mesi'}`
      : 'Dead · >36 mesi'
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: accent }}>{label}</span>
      <span className="text-xs font-medium" style={{ color }}>{text}</span>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="mb-1 font-medium text-gray-700">Mese {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmtEurFull(p.value)}
        </p>
      ))}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

const SCENARIO_DEFAULTS = {
  best:  { revenueGrowth: '15', costGrowth: '1' },
  base:  { revenueGrowth: '8',  costGrowth: '2' },
  worst: { revenueGrowth: '3',  costGrowth: '5' }
}

export function DefaultAnalysis() {
  const [common, setCommon] = useState({ revenue: '', costs: '', cash: '' })
  const [scenarios, setScenarios] = useState(SCENARIO_DEFAULTS)

  const updCommon = (k) => (e) => setCommon((p) => ({ ...p, [k]: e.target.value }))
  const updScenario = (s, k) => (e) => setScenarios((p) => ({ ...p, [s]: { ...p[s], [k]: e.target.value } }))

  const parsed = useMemo(() => ({
    revenue: parseFloat(common.revenue) || 0,
    costs:   parseFloat(common.costs)   || 0,
    cash:    parseFloat(common.cash)    || 0
  }), [common])

  const hasData = parsed.costs > 0 || parsed.revenue > 0 || parsed.cash > 0

  const results = useMemo(() => {
    if (!hasData) return null
    const run = (s) => runProjection(
      parsed.revenue, parsed.costs, parsed.cash,
      (parseFloat(scenarios[s].revenueGrowth) || 0) / 100,
      (parseFloat(scenarios[s].costGrowth)    || 0) / 100
    )
    return { best: run('best'), base: run('base'), worst: run('worst') }
  }, [parsed, scenarios, hasData])

  const base   = results?.base
  const isAlive = base?.alive ?? false

  // chart data
  const cashChartData = useMemo(() => {
    if (!results) return []
    const len = Math.max(results.best.data.length, results.base.data.length, results.worst.data.length)
    const rows = Array.from({ length: len }, (_, i) => ({
      month: i + 1,
      best:  results.best.data[i]?.cash  ?? null,
      base:  results.base.data[i]?.cash  ?? null,
      worst: results.worst.data[i]?.cash ?? null
    }))
    return [{ month: 0, best: parsed.cash, base: parsed.cash, worst: parsed.cash }, ...rows]
  }, [results, parsed.cash])

  const revenueChartData = useMemo(() => {
    if (!results) return []
    return results.base.data.map((d) => ({ month: d.month, revenue: d.revenue, costs: d.costs }))
  }, [results])

  const scenarioCfg = [
    { key: 'best',  label: 'Best',  accent: '#15803d', color: '#16a34a' },
    { key: 'base',  label: 'Base',  accent: '#1d4ed8', color: '#2563eb' },
    { key: 'worst', label: 'Worst', accent: '#b91c1c', color: '#dc2626' }
  ]

  return (
    <div className="space-y-4">

      {/* ── TOP: INPUT (sx) + INDICATOR (dx) ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* LEFT: inputs */}
        <div className="flex flex-col gap-3">

          {/* Dati correnti */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Dati attuali</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={LABEL}>Ricavi mensili (€)</label>
                <input className={INPUT_CLS} type="number" min="0" placeholder="15 000" value={common.revenue} onChange={updCommon('revenue')} />
              </div>
              <div>
                <label className={LABEL}>Costi mensili (€)</label>
                <input className={INPUT_CLS} type="number" min="0" placeholder="30 000" value={common.costs} onChange={updCommon('costs')} />
              </div>
              <div>
                <label className={LABEL}>Cassa attuale (€)</label>
                <input className={INPUT_CLS} type="number" min="0" placeholder="200 000" value={common.cash} onChange={updCommon('cash')} />
              </div>
            </div>
          </div>

          {/* Tassi di crescita per scenario */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Crescita mensile per scenario</p>
            <div className="grid grid-cols-3 gap-3">
              {scenarioCfg.map(({ key, label, accent }) => (
                <div key={key}>
                  <p className="mb-2 text-xs font-semibold" style={{ color: accent }}>{label}</p>
                  <div className="space-y-2">
                    <div>
                      <label className={LABEL}>Ricavi (%)</label>
                      <input
                        className={INPUT_SM}
                        type="number"
                        placeholder="0"
                        value={scenarios[key].revenueGrowth}
                        onChange={updScenario(key, 'revenueGrowth')}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Costi (%)</label>
                      <input
                        className={INPUT_SM}
                        type="number"
                        placeholder="0"
                        value={scenarios[key].costGrowth}
                        onChange={updScenario(key, 'costGrowth')}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: indicator */}
        {hasData && base ? (
          <div className={`rounded-xl border p-5 flex flex-col justify-between ${isAlive ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${isAlive ? 'text-green-600' : 'text-red-600'}`}>
                Verdetto — Base case
              </p>
              <div className={`text-3xl font-semibold tracking-tight ${isAlive ? 'text-green-700' : 'text-red-700'}`}>
                {isAlive ? 'Default Alive' : 'Default Dead'}
              </div>
              <p className={`mt-2 text-sm ${isAlive ? 'text-green-600' : 'text-red-500'}`}>
                {isAlive
                  ? `Break-even stimato al mese ${base.breakEvenMonth}`
                  : base.deadMonth
                    ? `Runway di ${base.deadMonth} ${base.deadMonth === 1 ? 'mese' : 'mesi'} rimanenti`
                    : 'La cassa non si esaurisce in 36 mesi, ma il break-even non viene raggiunto'}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-black/5 pt-4">
              {scenarioCfg.map(({ key, label, accent, color }) => (
                <ScenarioResult key={key} label={label} result={results[key]} color={color} accent={accent} />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 flex items-center justify-center p-5 text-sm text-gray-400 text-center">
            Inserisci i dati per vedere il verdetto
          </div>
        )}
      </div>

      {/* ── GRAFICO 1: Cash over time ───────────────────────────────────────── */}
      {hasData && cashChartData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Cassa nel tempo</p>
          <p className="mb-4 text-xs text-gray-400">Best / Base / Worst — proiezione mensile</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cashChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} label={{ value: 'Mesi', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={fmtEur} width={56} domain={parsed.cash > 0 ? [-(parsed.cash * 0.08), parsed.cash * 3] : ['auto', 'auto']} ticks={parsed.cash > 0 ? [0, parsed.cash, parsed.cash * 2, parsed.cash * 3] : undefined} allowDataOverflow />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} />
              <Line dataKey="best"  name="Best"  stroke="#16a34a" strokeWidth={1.5} dot={false} connectNulls />
              <Line dataKey="base"  name="Base"  stroke="#2563eb" strokeWidth={2}   dot={false} connectNulls />
              <Line dataKey="worst" name="Worst" stroke="#dc2626" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex gap-4">
            {[{ label: 'Best', color: '#16a34a' }, { label: 'Base', color: '#2563eb' }, { label: 'Worst', color: '#dc2626' }].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GRAFICO 2: Ricavi vs Costi ─────────────────────────────────────── */}
      {hasData && revenueChartData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Ricavi vs Costi — Base case</p>
          <p className="mb-4 text-xs text-gray-400">
            {base?.breakEvenMonth
              ? <>Break-even al mese <span className="font-medium text-gray-700">{base.breakEvenMonth}</span></>
              : 'Nessun break-even nei prossimi 36 mesi'}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} label={{ value: 'Mesi', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={fmtEur} width={56} />
              <Tooltip content={<CustomTooltip />} />
              {base?.breakEvenMonth && (
                <ReferenceLine x={base.breakEvenMonth} stroke="#9ca3af" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'break-even', position: 'top', fontSize: 10, fill: '#9ca3af' }} />
              )}
              <Line dataKey="revenue" name="Ricavi" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line dataKey="costs"   name="Costi"  stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex gap-4">
            {[{ label: 'Ricavi', color: '#16a34a' }, { label: 'Costi', color: '#dc2626' }].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
