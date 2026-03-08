'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, PlusCircle } from 'lucide-react'
import { parseIncomeRows, parseExpenseRows, parseTransferRows } from '@/lib/personal-finance/import-parser'
import { bulkInsertTransactions, createAccount } from '@/lib/personal-finance/queries'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

function extractMissingAccounts(errors) {
  const names = new Set()
  for (const e of errors) {
    const m = e.match(/conto(?: FROM| TO)? non trovato "([^"]+)"/)
    if (m) names.add(m[1])
  }
  return [...names]
}

export default function ImportModal({ type, categories, accounts: initialAccounts, onImported, onClose }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState(initialAccounts)
  const [creatingAccount, setCreatingAccount] = useState(null) // name being created

  function runParse(accs) {
    const list = accs ?? accounts
    if (type === 'income') return parseIncomeRows(text, categories, list)
    if (type === 'expense') return parseExpenseRows(text, categories, list)
    return parseTransferRows(text, list)
  }

  function handleParse() {
    if (!text.trim()) return toast.error('Incolla i dati dal tuo foglio Excel')
    setPreview(runParse())
  }

  async function handleCreateAccount(name) {
    setCreatingAccount(name)
    try {
      const newAcc = await createAccount({ name, initial_balance: 0 })
      const updated = [...accounts, newAcc]
      setAccounts(updated)
      setPreview(runParse(updated))
      toast.success(`Conto "${name}" creato`)
    } catch (err) {
      toast.error(err.message || 'Errore creazione conto')
    } finally {
      setCreatingAccount(null)
    }
  }

  async function handleImport() {
    if (!preview?.valid?.length) return
    setLoading(true)
    try {
      await bulkInsertTransactions(preview.valid)
      toast.success(`${preview.valid.length} transazioni importate`)
      onImported()
      onClose()
    } catch (err) {
      toast.error(err.message || "Errore durante l'importazione")
    } finally {
      setLoading(false)
    }
  }

  const typeLabel = type === 'income' ? 'entrate' : type === 'expense' ? 'uscite' : 'trasferimenti'

  const exampleHeaders =
    type === 'income'
      ? 'DATE · MONTH · CATEGORY · DESCRIPTION · AMOUNT · ACCOUNT'
      : type === 'expense'
        ? 'DATE · MONTH · CATEGORY · DETAILS · DESCRIPTION · AMOUNT · ACCOUNT'
        : 'DATE · MONTH · FROM · TO · DESCRIPTION · AMOUNT'

  return (
    /* Layout: colonna flex, altezza limitata, scroll solo nella zona centrale */
    <div className="flex max-h-[70vh] flex-col gap-0">

      {/* Zona scrollabile */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
        <div>
          <p className="text-sm text-gray-600">
            Copia le celle dal tuo foglio Excel (inclusa la riga di intestazione) e incollale qui sotto.
          </p>
          <p className="mt-1 font-mono text-xs text-gray-400">{exampleHeaders}</p>
        </div>

        <Textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setPreview(null) }}
          placeholder="Incolla qui i dati da Excel..."
          className="min-h-[120px] font-mono text-xs"
        />

        {preview && (
          <div className="flex flex-col gap-3">
            {preview.valid.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{preview.valid.length} righe valide pronte per l&apos;importazione</span>
              </div>
            )}

            {extractMissingAccounts(preview.errors).length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <AlertTriangle size={16} className="shrink-0" />
                  Conti non trovati — creali qui sotto
                </div>
                <ul className="mt-2 space-y-1.5">
                  {extractMissingAccounts(preview.errors).map((name) => (
                    <li key={name} className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-amber-700">{name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 gap-1 px-2 text-xs"
                        disabled={creatingAccount === name}
                        onClick={() => handleCreateAccount(name)}
                      >
                        <PlusCircle size={12} />
                        {creatingAccount === name ? 'Creazione...' : 'Crea conto'}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                  <AlertTriangle size={16} className="shrink-0" />
                  {preview.errors.length} errori rilevati
                </div>
                <ul className="mt-2 space-y-0.5">
                  {preview.errors.slice(0, 50).map((err, i) => (
                    <li key={i} className="font-mono text-xs text-red-600">{err}</li>
                  ))}
                  {preview.errors.length > 50 && (
                    <li className="text-xs text-red-400">...e altri {preview.errors.length - 50} errori</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer sempre visibile */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
        {!preview ? (
          <>
            <Button variant="outline" onClick={onClose} disabled={loading}>Annulla</Button>
            <Button onClick={handleParse} disabled={!text.trim()}>
              Analizza dati
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => { setText(''); setPreview(null) }} disabled={loading}>
              Pulisci
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>Annulla</Button>
            <Button onClick={handleImport} disabled={!preview.valid.length || loading}>
              {loading ? 'Importazione...' : `Importa ${preview.valid.length} ${typeLabel}`}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
