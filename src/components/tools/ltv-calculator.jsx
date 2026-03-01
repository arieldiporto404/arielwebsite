'use client'

import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
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
  if (abs >= 1_000) return sign + '€' + (abs / 1_000).toFixed(1) + 'k'
  return sign + '€' + abs.toFixed(0)
}

const fmtEurFull = (v) => {
  if (v == null || isNaN(v)) return '—'
  const abs = Math.abs(v)
  const formatted = abs.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return (v < 0 ? '-' : '') + '€\u202f' + formatted
}

// ─── benchmark helpers ────────────────────────────────────────────────────────

function paybackTheme(months) {
  if (months < 12)  return { text: 'text-green-700', border: 'border-green-200', bg: 'bg-green-50',  label: 'Ottimo' }
  if (months <= 18) return { text: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50',  label: 'Accettabile' }
  return              { text: 'text-red-700',   border: 'border-red-200',   bg: 'bg-red-50',   label: 'Critico' }
}

function ltvCacTheme(ratio) {
  if (ratio > 3)  return { text: 'text-green-700', border: 'border-green-200', bg: 'bg-green-50',  label: 'Sano' }
  if (ratio >= 1) return { text: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50',  label: 'Da migliorare' }
  return            { text: 'text-red-700',   border: 'border-red-200',   bg: 'bg-red-50',   label: 'Non sostenibile' }
}

function interpTheme(ratio) {
  if (ratio > 3)  return { text: 'text-green-700', border: 'border-green-200', bg: 'bg-green-50',  label: 'text-green-600' }
  if (ratio >= 1) return { text: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50',  label: 'text-amber-600' }
  return            { text: 'text-red-700',   border: 'border-red-200',   bg: 'bg-red-50',   label: 'text-red-600' }
}

// ─── Tailwind tokens ──────────────────────────────────────────────────────────

const LABEL = 'block text-xs font-medium text-gray-500 mb-1'
const INPUT_CLS =
  'h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950'

// ─── tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="mb-1 font-medium text-gray-700">Mese {label}</p>
      <p style={{ color: val >= 0 ? '#16a34a' : '#dc2626' }}>
        Profitto: {fmtEurFull(val)}
      </p>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function LtvCalculator() {
  const [form, setForm] = useState({ arpu: '', grossMargin: '', churnRate: '', cac: '' })
  const upd = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const parsed = useMemo(
    () => ({
      arpu:        parseFloat(form.arpu)        || 0,
      grossMargin: parseFloat(form.grossMargin) || 0,
      churnRate:   parseFloat(form.churnRate)   || 0,
      cac:         parseFloat(form.cac)         || 0
    }),
    [form]
  )

  const hasData = parsed.arpu > 0 && parsed.grossMargin > 0 && form.churnRate !== ''

  const result = useMemo(() => {
    if (!hasData) return null
    const gm             = parsed.grossMargin / 100
    const cr             = parsed.churnRate   / 100
    const infinite       = cr === 0
    const customerLifetime = infinite ? Infinity : 1 / cr
    const ltv            = infinite ? Infinity : parsed.arpu * gm * customerLifetime
    const paybackTime    = parsed.cac > 0 ? parsed.cac / (parsed.arpu * gm) : null
    const ltvCac         = parsed.cac > 0 && !infinite ? ltv / parsed.cac : (parsed.cac > 0 && infinite ? Infinity : null)
    const netPerCustomer = infinite ? Infinity : (parsed.cac > 0 ? ltv - parsed.cac : ltv)
    return { customerLifetime, ltv, paybackTime, ltvCac, netPerCustomer, infinite }
  }, [hasData, parsed])

  const chartData = useMemo(() => {
    if (!result || !result.paybackTime) return []
    const gm = parsed.grossMargin / 100
    const cr = parsed.churnRate   / 100
    // mostra ~3× il customer lifetime per vedere l'asintoto, min 24 mesi, max 84
    const displayMax = Math.min(
      Math.max(Math.ceil(result.customerLifetime * 3), 24),
      84
    )
    return Array.from({ length: displayMax + 1 }, (_, m) => {
      // revenue cumulativo della coorte al mese m (con sopravvivenza che decade)
      // = ARPU × GM × Σ(k=0..m-1) (1-cr)^k = ARPU × GM × (1 - (1-cr)^m) / cr
      const cumRev = cr > 0
        ? parsed.arpu * gm * (1 - Math.pow(1 - cr, m)) / cr
        : m * parsed.arpu * gm
      return { month: m, profit: Math.round(cumRev - parsed.cac) }
    })
  }, [result, parsed])

  const pbTheme = result?.paybackTime != null ? paybackTheme(result.paybackTime) : null
  const lcTheme = result?.ltvCac       != null ? ltvCacTheme(result.ltvCac)      : null
  const itTheme = result?.ltvCac       != null ? interpTheme(result.ltvCac)      : null

  const paybackMonth = result?.paybackTime ? Math.ceil(result.paybackTime) : null

  return (
    <div className="space-y-4">

      {/* ── INPUTS ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Metriche</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className={LABEL}>ARPU mensile (€)</label>
            <input className={INPUT_CLS} type="number" min="0" placeholder="50" value={form.arpu} onChange={upd('arpu')} />
          </div>
          <div>
            <label className={LABEL}>Gross Margin (%)</label>
            <input className={INPUT_CLS} type="number" min="0" max="100" placeholder="70" value={form.grossMargin} onChange={upd('grossMargin')} />
          </div>
          <div>
            <label className={LABEL}>Churn Rate mensile (%)</label>
            <input className={INPUT_CLS} type="number" min="0" max="100" placeholder="5" value={form.churnRate} onChange={upd('churnRate')} />
          </div>
          <div>
            <label className={LABEL}>CAC (€)</label>
            <input className={INPUT_CLS} type="number" min="0" placeholder="300" value={form.cac} onChange={upd('cac')} />
          </div>
        </div>
      </div>

      {hasData && result ? (
        <>
          {/* ── QUATTRO CARD ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">

            {/* Customer Lifetime */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Customer Lifetime</p>
              <div className="text-3xl font-semibold tracking-tight font-mono text-gray-900">
                {result.infinite ? '∞' : Math.round(result.customerLifetime)}
                <span className="text-lg font-normal"> mesi</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {result.infinite
                  ? 'Churn 0%'
                  : `Churn ${parsed.churnRate}%`}
              </p>
            </div>

            {/* LTV */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Lifetime Value</p>
              <div className="text-3xl font-semibold tracking-tight font-mono text-gray-900">
                {result.infinite ? '∞' : fmtEurFull(result.ltv)}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {result.infinite
                  ? `ARPU ${fmtEurFull(parsed.arpu)} × GM ${parsed.grossMargin}% × ∞ mesi`
                  : `ARPU ${fmtEurFull(parsed.arpu)} × GM ${parsed.grossMargin}% × ${Math.round(result.customerLifetime)} mesi`}
              </p>
            </div>

            {/* Payback Time */}
            {result.paybackTime != null ? (
              <div className={`rounded-xl border p-5 shadow-sm ${pbTheme.border} ${pbTheme.bg}`}>
                <p className={`mb-3 text-[10px] font-semibold uppercase tracking-widest ${pbTheme.text}`}>Payback Time</p>
                <div className={`text-3xl font-semibold tracking-tight font-mono ${pbTheme.text}`}>
                  {result.paybackTime.toFixed(1)}{' '}
                  <span className="text-lg font-normal">mesi</span>
                </div>
                <p className={`mt-2 text-xs font-semibold ${pbTheme.text}`}>{pbTheme.label}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-5 flex items-center justify-center text-sm text-gray-400">
                Inserisci il CAC
              </div>
            )}

            {/* LTV/CAC */}
            {result.ltvCac != null ? (
              <div className={`rounded-xl border p-5 shadow-sm ${lcTheme.border} ${lcTheme.bg}`}>
                <p className={`mb-3 text-[10px] font-semibold uppercase tracking-widest ${lcTheme.text}`}>LTV / CAC</p>
                <div className={`text-3xl font-semibold tracking-tight font-mono ${lcTheme.text}`}>
                  {result.ltvCac === Infinity ? '∞' : result.ltvCac.toFixed(2)}x
                </div>
                <p className={`mt-2 text-xs font-semibold ${lcTheme.text}`}>{lcTheme.label}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-5 flex items-center justify-center text-sm text-gray-400">
                Inserisci il CAC
              </div>
            )}
          </div>

          {/* ── GRAFICO ───────────────────────────────────────────────────────── */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Profitto cumulativo della coorte</p>
              <p className="mb-4 text-xs text-gray-400">
                Break-even al mese{' '}
                <span className="font-medium text-gray-700">{result.paybackTime?.toFixed(1)}</span>
                {' — '}zona rossa: ancora in perdita · zona bianca: profitto netto
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Mesi', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9ca3af' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fmtEur}
                    width={56}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  {paybackMonth != null && (
                    <ReferenceArea x1={0} x2={paybackMonth} fill="#fef2f2" fillOpacity={0.8} />
                  )}
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" strokeWidth={1} />
                  {result.paybackTime != null && (
                    <ReferenceLine
                      x={result.paybackTime}
                      stroke="#9ca3af"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{ value: 'break-even', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
                    />
                  )}
                  <Line dataKey="profit" name="Profitto" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── INTERPRETAZIONE ───────────────────────────────────────────────── */}
          {itTheme && (
            <div className={`rounded-xl border p-4 ${itTheme.border} ${itTheme.bg}`}>
              <p className={`mb-2 text-[10px] font-semibold uppercase tracking-widest ${itTheme.label}`}>
                Interpretazione
              </p>
              <p className={`text-sm leading-relaxed ${itTheme.text}`}>
                {result.infinite
                  ? 'Con un churn dello 0%, i clienti non abbandonano mai — lifetime e LTV sono teoricamente infiniti. '
                  : <>Con un churn del {parsed.churnRate}%, ogni cliente resta in media{' '}
                    <strong>{Math.round(result.customerLifetime)} mesi</strong>.{' '}</>}
                {parsed.cac > 0 && (
                  <>
                    Spendi <strong>{fmtEurFull(parsed.cac)}</strong> per acquisirlo e recuperi l&apos;investimento in{' '}
                    <strong>{result.paybackTime?.toFixed(1)} mesi</strong>.{' '}
                  </>
                )}
                {!result.infinite && (
                  <>Ogni cliente genera un profitto netto di{' '}
                  <strong>{fmtEurFull(result.netPerCustomer)}</strong> nel suo ciclo di vita.</>
                )}
              </p>
              <p className={`mt-2 text-sm font-semibold ${itTheme.text}`}>
                {result.ltvCac === Infinity || result.ltvCac > 3
                  ? 'Unit economics sane, puoi scalare l\'acquisizione.'
                  : result.ltvCac >= 1
                    ? 'Il business è sostenibile ma con margini stretti. Lavora sul churn o sul CAC.'
                    : 'Stai perdendo soldi su ogni cliente acquisito. Rivedi urgentemente il modello.'}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 flex items-center justify-center p-10 text-sm text-gray-400 text-center">
          Inserisci ARPU, gross margin e churn rate per vedere i risultati
        </div>
      )}

    </div>
  )
}
