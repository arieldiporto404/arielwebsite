'use client'

import { useMemo, useState } from 'react'

// ─── utilities ───────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9)

const computeIRR = (cashFlows) => {
  if (cashFlows.length < 2) return null
  const d0 = new Date(cashFlows[0].date)
  const years = cashFlows.map((cf) => ({
    amount: cf.amount,
    t: (new Date(cf.date) - d0) / (365.25 * 24 * 3600000)
  }))
  let rate = 0.1
  for (let i = 0; i < 200; i++) {
    let npv = 0,
      dnpv = 0
    for (const cf of years) {
      const disc = Math.pow(1 + rate, cf.t)
      if (disc === 0 || !isFinite(disc)) break
      npv += cf.amount / disc
      dnpv -= (cf.t * cf.amount) / (disc * (1 + rate))
    }
    if (Math.abs(npv) < 0.01) return rate
    if (dnpv === 0) break
    rate -= npv / dnpv
    if (rate < -0.99) rate = -0.99
    if (rate > 100) rate = 100
  }
  return rate
}

const fmtPct = (v) => (v == null ? '' : (v * 100).toFixed(2).replace('.', ',') + '%')
const fmtEur = (v) => {
  if (v == null || isNaN(v)) return '—'
  const num = Number(v)
  const abs = Math.abs(num)
  const formatted = abs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (num < 0 ? '-' : '') + '€ ' + formatted
}
const fmtMoic = (v) => (v == null || !isFinite(v) ? '—' : v.toFixed(2) + 'x')
const fmtIrr = (v) => (v == null || !isFinite(v) ? '—' : (v * 100).toFixed(1) + '%')

// ─── Tailwind class tokens ────────────────────────────────────────────────────

// Table header cells
const HDR = 'h-7 border-b border-r border-gray-200 bg-gray-50 px-2 align-middle text-center text-[10px] font-semibold uppercase tracking-widest text-blue-600 whitespace-nowrap'
const HDR_LEFT = 'h-7 sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-2 align-middle text-left text-[10px] font-semibold text-gray-400 whitespace-nowrap'

// Regular data cells
const CELL = 'h-7 border-b border-r border-gray-200 px-2 align-middle text-right font-mono text-xs text-gray-700 whitespace-nowrap min-w-[60px]'
const CELL_LEFT = 'h-7 sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-2 align-middle text-left text-xs font-medium text-gray-900 whitespace-nowrap min-w-[110px]'
const CELL_LEFT_MUTED = 'h-7 sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-2 align-middle text-left text-xs font-normal text-gray-500 whitespace-nowrap min-w-[110px]'
const CELL_LEFT_DIM = 'h-7 sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-2 align-middle text-left text-xs font-normal italic text-gray-400 whitespace-nowrap min-w-[110px]'
const CELL_LEFT_TOTAL = 'h-7 sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-2 align-middle text-left text-xs font-semibold text-gray-900 whitespace-nowrap min-w-[110px]'
const CELL_INPUT = 'h-7 border-b border-r border-gray-200 bg-gray-50 px-2 align-middle min-w-[60px]'
const CELL_COMPUTED = 'h-7 border-b border-r border-gray-200 px-2 align-middle text-right font-mono text-xs italic text-gray-400 whitespace-nowrap min-w-[60px]'

// Inputs
const INPUT = 'w-full border-none bg-transparent p-0 font-mono text-xs text-right text-gray-900 outline-none'
const INPUT_LEFT = 'w-full border-none bg-transparent p-0 text-xs font-medium text-gray-900 outline-none'

// Buttons
const BTN = 'cursor-pointer rounded-full border border-dashed border-gray-300 bg-transparent px-2.5 py-0.5 text-xs text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-800'

// Type → dot color
const TYPE_COLOR = {
  founder: '#2563eb',
  investor: '#16a34a',
  esop: '#0891b2',
  esop_pool: '#0891b2',
  unknown: '#9ca3af'
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Dot({ color }) {
  return <span className="mr-1.5 inline-block size-1.5 shrink-0 rounded-full" style={{ background: color }} />
}

function EurInput({ value, onChange, placeholder, green }) {
  const [focused, setFocused] = useState(false)
  const numVal = parseFloat(value)
  const hasValue = value && !isNaN(numVal)
  return (
    <td className={CELL_INPUT}>
      {focused ? (
        <input
          className={`${INPUT}${green ? ' text-green-700' : ''}`}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '0'}
          onBlur={() => setFocused(false)}
          autoFocus
        />
      ) : (
        <div
          className={`min-h-[18px] w-full cursor-text text-right font-mono text-xs ${
            hasValue ? (green ? 'text-green-700' : 'text-gray-900') : 'text-gray-400'
          }`}
          onClick={() => setFocused(true)}
        >
          {hasValue ? fmtEur(numVal) : <span className="opacity-40">{placeholder || '€ 0'}</span>}
        </div>
      )}
    </td>
  )
}

function ExitAmountInput({ value, onChange }) {
  const [focused, setFocused] = useState(false)
  const numVal = parseFloat(value)
  const hasValue = value && !isNaN(numVal)
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] text-gray-400">Importo:</span>
      {focused ? (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="20000000"
          className="w-28 border-none bg-transparent p-0 font-mono text-xs text-gray-900 outline-none"
          onBlur={() => setFocused(false)}
          autoFocus
        />
      ) : (
        <div
          className={`w-28 cursor-text font-mono text-xs ${hasValue ? 'text-gray-900' : 'text-gray-400'}`}
          onClick={() => setFocused(true)}
        >
          {hasValue ? fmtEur(numVal) : <span className="opacity-40">€ 0</span>}
        </div>
      )}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function EquityStory() {
  const [founders, setFounders] = useState([
    { id: uid(), name: 'Founder', pct: 100, invested: '', investDate: '' }
  ])
  const [esops, setEsops] = useState([])
  const [rounds, setRounds] = useState([])
  const [exit, setExit] = useState({ date: '2028-01-31', amount: '' })

  const upd =
    (setter) => (id, key, val) =>
      setter((arr) => arr.map((x) => (x.id === id ? { ...x, [key]: val } : x)))
  const addTo = (setter, obj) => () => setter((arr) => [...arr, { id: uid(), ...obj }])
  const removeFrom = (setter) => (id) => setter((arr) => arr.filter((x) => x.id !== id))

  const uf = upd(setFounders)
  const ue = upd(setEsops)
  const ur = upd(setRounds)

  // ── cap table ──────────────────────────────────────────────────────────────
  const model = useMemo(() => {
    const snapshots = []
    let owners = [
      ...founders.map((f) => ({ id: f.id, name: f.name, type: 'founder', shares: parseFloat(f.pct) || 0 })),
      ...esops.map((e) => ({ id: e.id, name: e.name || 'ESOP', type: 'esop', shares: parseFloat(e.pct) || 0 }))
    ]
    const totalInit = owners.reduce((s, o) => s + o.shares, 0)
    if (totalInit > 0) owners = owners.map((o) => ({ ...o, shares: (o.shares / totalInit) * 100 }))

    snapshots.push({
      label: 'Start',
      entries: Object.fromEntries(owners.map((o) => [o.id, o.shares / 100]))
    })

    const roundMeta = []

    for (const r of rounds) {
      const pre = parseFloat(r.preMoney) || 0
      const raised = parseFloat(r.raised) || 0
      const esopPct = (parseFloat(r.esopPct) || 0) / 100

      if (pre <= 0 || raised <= 0) {
        snapshots.push({
          label: r.name,
          entries: Object.fromEntries(owners.map((o) => [o.id, o.shares / 100]))
        })
        roundMeta.push({ ...r, investorId: null })
        continue
      }

      const post = pre + raised
      const invPctRaw = raised / post
      const existingMult = 1 - invPctRaw - esopPct

      owners = owners.map((o) => ({ ...o, shares: o.shares * existingMult }))
      const invId = uid()
      owners.push({ id: invId, name: r.name, type: 'investor', shares: invPctRaw * 100 })

      let esopPoolId = null
      if (esopPct > 0) {
        esopPoolId = uid()
        owners.push({ id: esopPoolId, name: `ESOP (${r.name})`, type: 'esop_pool', shares: esopPct * 100 })
      }

      const tot = owners.reduce((s, o) => s + o.shares, 0)
      if (tot > 0) owners = owners.map((o) => ({ ...o, shares: (o.shares / tot) * 100 }))

      snapshots.push({
        label: r.name,
        entries: Object.fromEntries(owners.map((o) => [o.id, o.shares / 100]))
      })
      roundMeta.push({
        ...r,
        investorId: invId,
        esopPoolId,
        postMoney: post,
        dilution: invPctRaw,
        totalDilution: invPctRaw + esopPct
      })
    }

    const orderedIds = []
    for (const f of founders) orderedIds.push(f.id)
    for (const rm of roundMeta) { if (rm.investorId) orderedIds.push(rm.investorId) }
    for (const e of esops) orderedIds.push(e.id)
    for (const rm of roundMeta) { if (rm.esopPoolId) orderedIds.push(rm.esopPoolId) }

    return { owners, snapshots, roundMeta, orderedIds }
  }, [founders, esops, rounds])

  // ── exit waterfall ─────────────────────────────────────────────────────────
  const exitResult = useMemo(() => {
    const amt = parseFloat(exit.amount) || 0
    if (amt <= 0 || model.owners.length === 0) return null

    let remaining = amt
    const dist = {}
    model.owners.forEach((o) => (dist[o.id] = 0))
    const nonPartCapped = {}

    const invRounds = model.roundMeta.filter((r) => r.investorId && r.hasLiqPref).reverse()
    for (const rm of invRounds) {
      const raised = parseFloat(rm.raised) || 0
      const liq = Math.min(raised, remaining)
      dist[rm.investorId] += liq
      remaining -= liq
      if (rm.liqPrefType === 'non-participating') nonPartCapped[rm.investorId] = true
    }

    const proRata = model.owners.filter((o) => !nonPartCapped[o.id])
    const proRataTotal = proRata.reduce((s, o) => s + o.shares, 0)
    if (remaining > 0 && proRataTotal > 0) {
      for (const o of proRata) dist[o.id] += (o.shares / proRataTotal) * remaining
    }

    for (const rm of invRounds) {
      if (rm.liqPrefType === 'non-participating' && nonPartCapped[rm.investorId]) {
        const o = model.owners.find((x) => x.id === rm.investorId)
        if (o) {
          const totalShares = model.owners.reduce((s, x) => s + x.shares, 0)
          const fullProRata = (o.shares / totalShares) * amt
          if (fullProRata > dist[rm.investorId]) dist[rm.investorId] = fullProRata
        }
      }
    }

    const ownerMap = Object.fromEntries(model.owners.map((o) => [o.id, o]))
    return model.orderedIds
      .map((id) => {
        const o = ownerMap[id]
        if (!o) return null
        const d = dist[o.id] || 0
        let invested = 0, investDate = null
        const founderMatch = founders.find((f) => f.id === o.id)
        if (founderMatch) { invested = parseFloat(founderMatch.invested) || 0; investDate = founderMatch.investDate || null }
        const mr = model.roundMeta.find((r) => r.investorId === o.id)
        if (mr) { invested = parseFloat(mr.raised) || 0; investDate = mr.date || null }
        const moic = invested > 0 ? d / invested : null
        let irr = null
        if (invested > 0 && investDate && exit.date) {
          irr = computeIRR([{ amount: -invested, date: investDate }, { amount: d, date: exit.date }])
        }
        return { ...o, distribution: d, invested, investDate, moic, irr, pctOfExit: d / amt }
      })
      .filter(Boolean)
  }, [exit, model, founders])

  const numCols = 1 + model.snapshots.length

  const getTypeColor = (id) => {
    if (founders.find((f) => f.id === id)) return TYPE_COLOR.founder
    if (model.roundMeta.find((r) => r.investorId === id)) return TYPE_COLOR.investor
    if (esops.find((e) => e.id === id)) return TYPE_COLOR.esop
    if (model.roundMeta.find((r) => r.esopPoolId === id)) return TYPE_COLOR.esop_pool
    return TYPE_COLOR.unknown
  }

  return (
    <div className="space-y-2">

      {/* ── CAP TABLE ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 w-fit max-w-full">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className={HDR_LEFT} />
              {model.snapshots.map((snap, i) => (
                <th key={i} className={HDR}>{snap.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>

            {/* FOUNDERS */}
            {founders.map((f) => (
              <tr key={f.id}>
                <td className={CELL_LEFT}>
                  <div className="flex items-center gap-1">
                    <Dot color={TYPE_COLOR.founder} />
                    <input
                      className={INPUT_LEFT}
                      value={f.name}
                      onChange={(e) => uf(f.id, 'name', e.target.value)}
                      placeholder="Founder"
                    />
                    {founders.length > 1 && (
                      <button
                        onClick={() => removeFrom(setFounders)(f.id)}
                        className="ml-1 cursor-pointer border-none bg-transparent p-0 text-[10px] text-gray-400 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </td>
                {model.snapshots.map((snap, i) =>
                  i === 0 ? (
                    <td key={i} className={CELL_INPUT}>
                      <div className="flex items-center justify-end gap-0.5">
                        <input
                          className="w-12 border-none bg-transparent p-0 font-mono text-xs text-right text-gray-900 outline-none"
                          type="number"
                          value={f.pct ?? ''}
                          onChange={(e) => uf(f.id, 'pct', e.target.value)}
                          placeholder="0"
                        />
                        <span className="text-[11px] text-gray-400">%</span>
                      </div>
                    </td>
                  ) : (
                    <td key={i} className={CELL}>{fmtPct(snap.entries[f.id])}</td>
                  )
                )}
              </tr>
            ))}

            {/* separator before investors */}
            {model.roundMeta.some((r) => r.investorId) && (
              <tr><td colSpan={numCols} className="h-1 bg-gray-100 p-0" /></tr>
            )}

            {/* INVESTORS */}
            {model.roundMeta.filter((r) => r.investorId).map((r) => (
              <tr key={r.investorId}>
                <td className={CELL_LEFT}>
                  <Dot color={TYPE_COLOR.investor} />
                  {r.name}
                </td>
                {model.snapshots.map((snap, i) => (
                  <td key={i} className={CELL}>{fmtPct(snap.entries[r.investorId])}</td>
                ))}
              </tr>
            ))}

            {/* separator before ESOP */}
            {(esops.length > 0 || model.roundMeta.some((r) => r.esopPoolId)) && (
              <tr><td colSpan={numCols} className="h-1 bg-gray-100 p-0" /></tr>
            )}

            {/* ESOP individuals */}
            {esops.map((e) => (
              <tr key={e.id}>
                <td className={CELL_LEFT}>
                  <div className="flex items-center gap-1">
                    <Dot color={TYPE_COLOR.esop} />
                    <input
                      className={INPUT_LEFT}
                      value={e.name}
                      onChange={(ev) => ue(e.id, 'name', ev.target.value)}
                      placeholder="ESOP"
                    />
                    <button
                      onClick={() => removeFrom(setEsops)(e.id)}
                      className="ml-1 cursor-pointer border-none bg-transparent p-0 text-[10px] text-gray-400 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                </td>
                {model.snapshots.map((snap, i) =>
                  i === 0 ? (
                    <td key={i} className={CELL_INPUT}>
                      <div className="flex items-center justify-end gap-0.5">
                        <input
                          className="w-12 border-none bg-transparent p-0 font-mono text-xs text-right text-gray-900 outline-none"
                          type="number"
                          value={e.pct ?? ''}
                          onChange={(ev) => ue(e.id, 'pct', ev.target.value)}
                          placeholder="0"
                        />
                        <span className="text-[11px] text-gray-400">%</span>
                      </div>
                    </td>
                  ) : (
                    <td key={i} className={CELL}>{fmtPct(snap.entries[e.id])}</td>
                  )
                )}
              </tr>
            ))}

            {/* ESOP pools */}
            {model.roundMeta.filter((r) => r.esopPoolId).map((r) => (
              <tr key={r.esopPoolId}>
                <td className={CELL_LEFT_DIM}>
                  <Dot color={TYPE_COLOR.esop_pool} />
                  ESOP ({r.name})
                </td>
                {model.snapshots.map((snap, i) => (
                  <td key={i} className={`${CELL} text-gray-400`}>{fmtPct(snap.entries[r.esopPoolId])}</td>
                ))}
              </tr>
            ))}

            {/* TOTALE */}
            <tr><td colSpan={numCols} className="h-1 bg-gray-100 p-0" /></tr>
            <tr className="bg-gray-50">
              <td className={CELL_LEFT_TOTAL}>Totale</td>
              {model.snapshots.map((snap, i) => {
                const tot = Object.values(snap.entries).reduce((a, b) => a + b, 0)
                return <td key={i} className={`${CELL} bg-gray-50 font-semibold`}>{fmtPct(tot)}</td>
              })}
            </tr>

            {/* ── ROUND DETAILS — solo se ci sono round ──────────────────── */}
            {rounds.length > 0 && (
              <>
                <tr><td colSpan={numCols} className="h-2 bg-white p-0" /></tr>
                <tr>
                  <th className={HDR_LEFT} />
                  {model.snapshots.map((snap, i) => (
                    <th key={i} className={HDR}>{i === 0 ? '' : rounds[i - 1]?.name || snap.label}</th>
                  ))}
                </tr>
                <tr>
                  <td className={CELL_LEFT_MUTED}>Premoney</td>
                  <td className={CELL} />
                  {rounds.map((r) => (
                    <EurInput key={r.id} value={r.preMoney} onChange={(v) => ur(r.id, 'preMoney', v)} placeholder="€ 0" />
                  ))}
                </tr>
                <tr>
                  <td className={CELL_LEFT_MUTED}>Round Size</td>
                  <td className={CELL} />
                  {rounds.map((r) => (
                    <EurInput key={r.id} value={r.raised} onChange={(v) => ur(r.id, 'raised', v)} placeholder="€ 0" green />
                  ))}
                </tr>
                <tr>
                  <td className={CELL_LEFT_MUTED}>Postmoney</td>
                  <td className={CELL} />
                  {rounds.map((r, i) => (
                    <td key={r.id} className={CELL_COMPUTED}>{model.roundMeta[i]?.postMoney ? fmtEur(model.roundMeta[i].postMoney) : ''}</td>
                  ))}
                </tr>
                <tr>
                  <td className={CELL_LEFT_MUTED}>Diluizione</td>
                  <td className={CELL} />
                  {rounds.map((r, i) => (
                    <td key={r.id} className={CELL_COMPUTED}>{model.roundMeta[i]?.dilution != null ? fmtPct(model.roundMeta[i].dilution) : ''}</td>
                  ))}
                </tr>
                <tr>
                  <td className={CELL_LEFT_MUTED}>ESOP</td>
                  <td className={CELL} />
                  {rounds.map((r) => (
                    <td key={r.id} className={CELL_INPUT}>
                      <input
                        className={INPUT}
                        type="number"
                        value={r.esopPct ?? ''}
                        onChange={(e) => ur(r.id, 'esopPct', e.target.value)}
                        placeholder="0%"
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={CELL_LEFT_MUTED}>Diluizione Totale</td>
                  <td className={CELL} />
                  {rounds.map((r, i) => (
                    <td key={r.id} className={CELL_COMPUTED}>{model.roundMeta[i]?.totalDilution != null ? fmtPct(model.roundMeta[i].totalDilution) : ''}</td>
                  ))}
                </tr>
                <tr>
                  <td className={CELL_LEFT_MUTED}>Liquidation Pref.</td>
                  <td className={CELL} />
                  {rounds.map((r) => (
                    <td key={r.id} className={CELL_INPUT}>
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="checkbox"
                          checked={r.hasLiqPref || false}
                          onChange={(e) => ur(r.id, 'hasLiqPref', e.target.checked)}
                          className="cursor-pointer accent-blue-600"
                        />
                        {r.hasLiqPref && (
                          <select
                            className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] text-blue-600 outline-none"
                            value={r.liqPrefType || 'participating'}
                            onChange={(e) => ur(r.id, 'liqPrefType', e.target.value)}
                          >
                            <option value="participating">1x Part.</option>
                            <option value="non-participating">1x Non Part.</option>
                          </select>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={CELL_LEFT_MUTED}>Data</td>
                  <td className={CELL} />
                  {rounds.map((r) => (
                    <td key={r.id} className={CELL_INPUT}>
                      <input
                        className={`${INPUT} text-blue-600`}
                        type="date"
                        value={r.date ?? ''}
                        onChange={(e) => ur(r.id, 'date', e.target.value)}
                      />
                    </td>
                  ))}
                </tr>

                {/* ── FOUNDER INVESTMENT ──────────────────────────────────── */}
                <tr><td colSpan={numCols} className="h-2 bg-white p-0" /></tr>
                <tr>
                  <th className={HDR_LEFT}>Investimento Fondatori</th>
                  {founders.map((f) => <th key={f.id} className={HDR}>{f.name}</th>)}
                  {model.snapshots.length > founders.length &&
                    Array.from({ length: model.snapshots.length - founders.length }).map((_, i) => (
                      <th key={`ef-${i}`} className={HDR} />
                    ))}
                </tr>
                <tr>
                  <td className={CELL_LEFT_MUTED}>Importo (€)</td>
                  {founders.map((f) => (
                    <EurInput key={f.id} value={f.invested} onChange={(v) => uf(f.id, 'invested', v)} placeholder="€ 0" />
                  ))}
                  {model.snapshots.length > founders.length &&
                    Array.from({ length: model.snapshots.length - founders.length }).map((_, i) => (
                      <td key={`ef-${i}`} className={CELL} />
                    ))}
                </tr>
                <tr>
                  <td className={CELL_LEFT_MUTED}>Data</td>
                  {founders.map((f) => (
                    <td key={f.id} className={CELL_INPUT}>
                      <input
                        className={`${INPUT} text-blue-600`}
                        type="date"
                        value={f.investDate ?? ''}
                        onChange={(e) => uf(f.id, 'investDate', e.target.value)}
                      />
                    </td>
                  ))}
                  {model.snapshots.length > founders.length &&
                    Array.from({ length: model.snapshots.length - founders.length }).map((_, i) => (
                      <td key={`ef-${i}`} className={CELL} />
                    ))}
                </tr>
              </>
            )}

          </tbody>
        </table>
      </div>

      {/* ── ACTION BUTTONS ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          className={BTN}
          onClick={addTo(setFounders, { name: 'Founder', pct: 0, invested: '', investDate: '' })}
        >
          + Founder
        </button>
        <button className={BTN} onClick={addTo(setEsops, { name: 'ESOP', pct: 0 })}>
          + ESOP
        </button>
        <button
          className={BTN}
          onClick={addTo(setRounds, {
            name: `Round ${rounds.length + 1}`,
            preMoney: '',
            raised: '',
            esopPct: '',
            hasLiqPref: true,
            liqPrefType: 'participating',
            date: ''
          })}
        >
          + Round
        </button>
        {rounds.length > 0 && (
          <button
            className={`${BTN} ml-auto border-red-300 text-red-500 hover:border-red-500 hover:text-red-700`}
            onClick={() => setRounds((r) => r.slice(0, -1))}
          >
            ✕ Rimuovi ultimo round
          </button>
        )}
      </div>

      {/* ── EXIT WATERFALL ────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 w-fit max-w-full">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
          <span className="font-mono text-xs font-bold text-blue-600">EXIT</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-gray-400">Data:</span>
            <input
              type="date"
              value={exit.date}
              onChange={(e) => setExit((x) => ({ ...x, date: e.target.value }))}
              className="w-28 border-none bg-transparent font-mono text-xs text-blue-600 outline-none"
            />
          </div>
          <ExitAmountInput value={exit.amount} onChange={(v) => setExit((x) => ({ ...x, amount: v }))} />
          {exit.amount && (
            <span className="ml-auto font-mono text-sm font-bold text-green-700">
              {fmtEur(parseFloat(exit.amount))}
            </span>
          )}
        </div>

        {exitResult && exitResult.length > 0 && (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={HDR_LEFT}>Socio</th>
                <th className={HDR}>% Finale</th>
                <th className={HDR}>Investito</th>
                <th className={HDR}>Distribuzione</th>
                <th className={HDR}>% Proceed</th>
                <th className={HDR}>MOIC</th>
                <th className={HDR}>IRR</th>
              </tr>
            </thead>
            <tbody>
              {exitResult.map((r) => (
                <tr key={r.id}>
                  <td className={CELL_LEFT}>
                    <Dot color={getTypeColor(r.id)} />
                    {r.name}
                  </td>
                  <td className={CELL}>{fmtPct(r.shares / 100)}</td>
                  <td className={CELL}>{r.invested > 0 ? fmtEur(r.invested) : '—'}</td>
                  <td className={`${CELL} font-semibold text-green-700`}>{fmtEur(r.distribution)}</td>
                  <td className={CELL}>{fmtPct(r.pctOfExit)}</td>
                  <td className={`${CELL} ${r.moic != null ? (r.moic >= 1 ? 'text-green-700' : 'text-red-600') : 'text-gray-400'}`}>
                    {fmtMoic(r.moic)}
                  </td>
                  <td className={`${CELL} ${r.irr != null ? (r.irr >= 0 ? 'text-green-700' : 'text-red-600') : 'text-gray-400'}`}>
                    {fmtIrr(r.irr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
