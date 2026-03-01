'use client'

import { useMemo, useState } from 'react'

// ─── utilities ───────────────────────────────────────────────────────────────

const fmtEurFull = (v) => {
  if (v == null || isNaN(v)) return '—'
  const abs = Math.abs(v)
  const formatted = abs.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (v < 0 ? '-' : '') + '€ ' + formatted
}

const fmtPct = (v) => {
  if (v == null || isNaN(v)) return '—'
  const pct = v * 100
  if (pct < 0.01) return (pct).toFixed(4) + '%'
  return pct.toFixed(4) + '%'
}

// ─── Tailwind tokens ─────────────────────────────────────────────────────────

const LABEL = 'block text-xs font-medium text-gray-500 mb-1'
const INPUT_CLS =
  'h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950'

// ─── main component ───────────────────────────────────────────────────────────

export function StockOptionCalculator() {
  const [tipo, setTipo] = useState('srl')
  const [form, setForm] = useState({
    capitaleSociale: '',
    totaleAzioni: '',
    valutazione: '',
    valoreNominale: '',
    prezzoSottoscrizione: '',
    azioniAssegnate: '',
    strikePrice: ''
  })

  const upd = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const parsed = useMemo(
    () => ({
      capitaleSociale:      parseFloat(form.capitaleSociale)      || 0,
      totaleAzioni:         parseFloat(form.totaleAzioni)         || 0,
      valutazione:          parseFloat(form.valutazione)          || 0,
      valoreNominale:       parseFloat(form.valoreNominale)       || 0,
      prezzoSottoscrizione: parseFloat(form.prezzoSottoscrizione) || 0,
      azioniAssegnate:      parseFloat(form.azioniAssegnate)      || 0,
      strikePrice:          parseFloat(form.strikePrice)          || 0
    }),
    [form]
  )

  const result = useMemo(() => {
    if (tipo === 'spa') {
      const { totaleAzioni, valutazione, azioniAssegnate, strikePrice } = parsed
      if (!totaleAzioni || !valutazione || !azioniAssegnate) return null
      const pricePerShare = valutazione / totaleAzioni
      const valoreLordo   = azioniAssegnate * pricePerShare
      const costo         = azioniAssegnate * strikePrice
      const netto         = valoreLordo - costo
      return {
        ownership:      azioniAssegnate / totaleAzioni,
        pricePerUnit:   pricePerShare,
        strikePerUnit:  strikePrice,
        guadagnoPerUnit: pricePerShare - strikePrice,
        valoreLordo,
        costo,
        netto,
        unitLabel: 'azione'
      }
    } else {
      const { capitaleSociale, valutazione, valoreNominale, prezzoSottoscrizione } = parsed
      if (!capitaleSociale || !valutazione || !valoreNominale) return null
      const ownership      = valoreNominale / capitaleSociale
      const controvalore   = ownership * valutazione
      const pricePerUnit   = valutazione / capitaleSociale
      const strikePerUnit  = prezzoSottoscrizione              // già per €1 nominale
      const costo          = prezzoSottoscrizione * valoreNominale
      const netto          = controvalore - costo
      return {
        ownership,
        pricePerUnit,
        strikePerUnit,
        guadagnoPerUnit: pricePerUnit - strikePerUnit,
        valoreLordo:     controvalore,
        costo,
        netto,
        unitLabel:       '€ nominale'
      }
    }
  }, [tipo, parsed])

  const isUnderwater = result !== null && result.netto < 0

  const rows = result
    ? [
        { label: 'Percentuale di ownership',                              value: fmtPct(result.ownership) },
        { label: `Valore per ${result.unitLabel} alla valutazione attuale`, value: fmtEurFull(result.pricePerUnit) },
        { label: `Prezzo di esercizio per ${result.unitLabel}`,           value: fmtEurFull(result.strikePerUnit) },
        { label: `Guadagno per ${result.unitLabel}`,                      value: fmtEurFull(result.guadagnoPerUnit), color: result.guadagnoPerUnit < 0 ? 'red' : null },
        { label: 'Controvalore totale alla valutazione',                  value: fmtEurFull(result.valoreLordo) },
        { label: 'Costo totale di esercizio',                             value: fmtEurFull(result.costo) },
        { label: 'Valore netto opzioni',                                  value: fmtEurFull(result.netto), bold: true, color: result.netto < 0 ? 'red' : 'green' }
      ]
    : []

  return (
    <div className="space-y-4">

      {/* ── TIPO SOCIETÀ ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Tipo di società</p>
        <div className="flex gap-2">
          {[{ key: 'srl', label: 'SRL — Quote di capitale sociale' }, { key: 'spa', label: 'SPA — Azioni' }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTipo(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tipo === key
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-transparent text-gray-500 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── INPUT + RESULT ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* LEFT: inputs */}
        <div className="flex flex-col gap-3">

          {/* Dati società */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Dati della società</p>
            <div className="flex flex-col gap-3">
              {tipo === 'srl' ? (
                <div>
                  <label className={LABEL}>Capitale sociale totale (€)</label>
                  <input className={INPUT_CLS} type="number" min="0" placeholder="10 000" value={form.capitaleSociale} onChange={upd('capitaleSociale')} />
                </div>
              ) : (
                <div>
                  <label className={LABEL}>Numero totale di azioni</label>
                  <input className={INPUT_CLS} type="number" min="0" placeholder="1 000 000" value={form.totaleAzioni} onChange={upd('totaleAzioni')} />
                </div>
              )}
              <div>
                <label className={LABEL}>Ultima valutazione post-money (€)</label>
                <input className={INPUT_CLS} type="number" min="0" placeholder="5 000 000" value={form.valutazione} onChange={upd('valutazione')} />
              </div>
            </div>
          </div>

          {/* Dati opzioni */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Le tue opzioni</p>
            <div className="flex flex-col gap-3">
              {tipo === 'srl' ? (
                <>
                  <div>
                    <label className={LABEL}>Valore nominale delle quote assegnate (€)</label>
                    <input className={INPUT_CLS} type="number" min="0" placeholder="100" value={form.valoreNominale} onChange={upd('valoreNominale')} />
                  </div>
                  <div>
                    <label className={LABEL}>Prezzo di sottoscrizione per €1 nominale (€)</label>
                    <input className={INPUT_CLS} type="number" min="0" placeholder="5 000" value={form.prezzoSottoscrizione} onChange={upd('prezzoSottoscrizione')} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={LABEL}>Numero di azioni assegnate</label>
                    <input className={INPUT_CLS} type="number" min="0" placeholder="10 000" value={form.azioniAssegnate} onChange={upd('azioniAssegnate')} />
                  </div>
                  <div>
                    <label className={LABEL}>Strike price per azione (€)</label>
                    <input className={INPUT_CLS} type="number" min="0" placeholder="0.50" value={form.strikePrice} onChange={upd('strikePrice')} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: result card */}
        {result ? (
          <div className={`rounded-xl border p-5 flex flex-col justify-between ${isUnderwater ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${isUnderwater ? 'text-red-600' : 'text-green-600'}`}>
                Valore delle tue opzioni
              </p>
              <div className={`text-3xl font-semibold tracking-tight font-mono ${isUnderwater ? 'text-red-700' : 'text-green-700'}`}>
                {fmtEurFull(result.netto)}
              </div>
              <p className={`mt-2 text-sm ${isUnderwater ? 'text-red-600' : 'text-green-600'}`}>
                {isUnderwater
                  ? 'Le opzioni sono underwater: il prezzo di esercizio è superiore al valore attuale'
                  : 'Come differenza tra il controvalore alla valutazione attuale e il costo di esercizio'}
              </p>
            </div>
            <div className="mt-6 border-t border-black/5 pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${isUnderwater ? 'text-red-500' : 'text-green-600'}`}>
                  Ownership
                </p>
                <p className={`text-xl font-semibold font-mono ${isUnderwater ? 'text-red-700' : 'text-green-700'}`}>
                  {fmtPct(result.ownership)}
                </p>
              </div>
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${isUnderwater ? 'text-red-500' : 'text-green-600'}`}>
                  Guadagno per {result.unitLabel}
                </p>
                <p className={`text-xl font-semibold font-mono ${isUnderwater ? 'text-red-700' : 'text-green-700'}`}>
                  {fmtEurFull(result.guadagnoPerUnit)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 flex items-center justify-center p-5 text-sm text-gray-400 text-center">
            Inserisci i dati per vedere il valore delle opzioni
          </div>
        )}
      </div>

      {/* ── RIEPILOGO DETTAGLIATO ────────────────────────────────────────────── */}
      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Riepilogo dettagliato</p>
          <div className="mt-3 divide-y divide-gray-100">
            {rows.map(({ label, value, bold, color }) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{label}</span>
                <span className={`text-sm font-mono ${
                  color === 'red'   ? 'font-semibold text-red-600'   :
                  color === 'green' ? 'font-semibold text-green-700' :
                  'text-gray-700'
                }`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NOTA INFORMATIVA ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Nota importante</p>
        <ul className="flex flex-col gap-1.5">
          {[
            'Il valore calcolato è teorico e basato sull\'ultima valutazione disponibile della società.',
            'Il valore reale si realizza solo in caso di exit (vendita, IPO) o vendita secondaria delle quote/azioni.',
            'Il calcolo non considera la tassazione applicabile all\'esercizio delle opzioni, eventuali clausole di lock-up, diritti di prelazione o altri vincoli contrattuali.',
            'Per una valutazione completa della tua situazione, consulta un commercialista o un consulente legale specializzato.'
          ].map((note, i) => (
            <li key={i} className="flex gap-2 text-xs text-gray-500">
              <span className="mt-px shrink-0 text-gray-300">·</span>
              {note}
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
