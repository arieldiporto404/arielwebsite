'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronRight, List } from 'lucide-react'
import {
  getAccountsWithBalanceAtDate,
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount
} from '@/lib/personal-finance/queries'
import { formatEur, formatDate } from '@/lib/personal-finance/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'

// ─── helpers ────────────────────────────────────────────────────────────────

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── AccountForm ─────────────────────────────────────────────────────────────

function AccountForm({ account, onSave, onClose }) {
  const [name, setName] = useState(account?.name ?? '')
  const [initialBalance, setInitialBalance] = useState(account?.initial_balance ?? 0)
  const [accountType, setAccountType] = useState(account?.account_type ?? 'asset')
  const [tagsInput, setTagsInput] = useState((account?.tags ?? []).join(', '))
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Inserisci un nome per il conto')
    setLoading(true)
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      await onSave({
        name: name.trim(),
        initial_balance: parseFloat(String(initialBalance).replace(',', '.')) || 0,
        account_type: accountType,
        tags
      })
      onClose()
    } catch (err) {
      toast.error(err.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acc-name">Nome conto</Label>
        <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Conto Corrente" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acc-type">Tipo</Label>
          <Select value={accountType} onValueChange={setAccountType}>
            <SelectTrigger id="acc-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asset">Attivo (Credito)</SelectItem>
              <SelectItem value="liability">Passivo (Debito)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acc-balance">Saldo iniziale (€)</Label>
          <Input
            id="acc-balance"
            type="number"
            step="0.01"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acc-tags">Tag <span className="font-normal text-gray-400">(separati da virgola)</span></Label>
        <Input
          id="acc-tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="es. Corrente, Fineco, Liquidità"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Annulla</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : 'Salva'}</Button>
      </DialogFooter>
    </form>
  )
}

function DeleteConfirmDialog({ account, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Errore durante l\'eliminazione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-500" />
        <div>
          <p className="text-sm text-gray-700">
            Stai per eliminare il conto <strong>"{account.name}"</strong>.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Le transazioni associate a questo conto non verranno eliminate, ma perderanno il riferimento al conto.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>Annulla</Button>
        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
          {loading ? 'Eliminazione...' : 'Elimina'}
        </Button>
      </DialogFooter>
    </div>
  )
}

// ─── AllAccountsDialog ───────────────────────────────────────────────────────

function AllAccountsDialog({ open, onClose, onEdit }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getAccounts().then((data) => setAccounts([...data].sort((a, b) => a.name.localeCompare(b.name, 'it')))).catch(() => toast.error('Errore caricamento')).finally(() => setLoading(false))
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tutti i conti</DialogTitle>
          <DialogDescription>Visualizza e modifica tag e tipo di ogni conto.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">Caricamento...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">Nome</th>
                  <th className="py-2 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">Tipo</th>
                  <th className="py-2 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">Tag</th>
                  <th className="py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-3 font-medium text-gray-800">{acc.name}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${acc.account_type === 'liability' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        {acc.account_type === 'liability' ? 'Passivo' : 'Attivo'}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {(acc.tags ?? []).length > 0
                          ? (acc.tags ?? []).map((t) => (
                              <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{t}</span>
                            ))
                          : <span className="text-xs text-gray-300">—</span>
                        }
                      </div>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => onEdit(acc)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Modifica"
                      >
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export default function AccountsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [showAll, setShowAll] = useState(false)

  function toggleGroup(key) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const load = useCallback(async (date) => {
    setLoading(true)
    try {
      const data = await getAccountsWithBalanceAtDate(toDateStr(date))
      setAccounts(data)
    } catch (err) {
      toast.error('Errore nel caricamento dei conti')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(selectedDate) }, [load, selectedDate])

  async function handleSave(values) {
    const fromAll = dialog?.fromAll
    if (dialog?.account) {
      await updateAccount(dialog.account.id, values)
      toast.success('Conto aggiornato')
    } else {
      await createAccount(values)
      toast.success('Conto creato')
    }
    await load(selectedDate)
    if (fromAll) setShowAll(true)
  }

  async function handleDelete() {
    await deleteAccount(dialog.account.id)
    toast.success('Conto eliminato')
    await load(selectedDate)
  }

  // Group accounts by first tag within each section
  function groupByTag(list) {
    const groups = {}
    const order = []
    for (const acc of list) {
      const tag = (acc.tags ?? [])[0] ?? 'Altro'
      if (!groups[tag]) { groups[tag] = []; order.push(tag) }
      groups[tag].push(acc)
    }
    return order.map((tag) => ({ tag, items: groups[tag] }))
  }

  const assets      = accounts.filter((a) => (a.account_type ?? 'asset') !== 'liability')
  const liabilities = accounts.filter((a) => a.account_type === 'liability')
  const assetGroups = groupByTag(assets).sort((a, b) => {
    if (a.tag === 'Altro') return 1
    if (b.tag === 'Altro') return -1
    return b.items.reduce((s, x) => s + x.balance, 0) - a.items.reduce((s, x) => s + x.balance, 0)
  })
  const liabilityGroups = groupByTag(liabilities).sort((a, b) => {
    if (a.tag === 'Altro') return 1
    if (b.tag === 'Altro') return -1
    return a.items.reduce((s, x) => s + x.balance, 0) - b.items.reduce((s, x) => s + x.balance, 0)
  })
  const totalAssets      = assets.reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0)
  const netWorth = totalAssets + totalLiabilities

  const hasAccounts = accounts.length > 0

  return (
    <div className="p-6 lg:p-8">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Conti</h1>
          <p className="mt-1 text-sm text-gray-500">Saldi alla data selezionata</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={toDateStr(selectedDate)}
            onChange={(e) => {
              if (e.target.value) setSelectedDate(new Date(e.target.value + 'T12:00:00'))
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-gray-400 focus:ring-0"
          />
          <Button variant="outline" onClick={() => setShowAll(true)}>
            <List size={16} className="mr-1.5" />
            Tutti i conti
          </Button>
          <Button onClick={() => setDialog({ type: 'add' })}>
            <Plus size={16} className="mr-1.5" />
            Nuovo conto
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">Caricamento...</div>
      ) : !hasAccounts ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-24 text-sm text-gray-400">
          <p>Nessun conto trovato</p>
          <Button variant="outline" className="mt-4" onClick={() => setDialog({ type: 'add' })}>
            <Plus size={16} className="mr-1.5" /> Crea il primo conto
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">Nome</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Saldo al {formatDate(toDateStr(selectedDate))}
                </th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>

              {/* ── ATTIVI ── */}
              {assets.length > 0 && (
                <>
                  <tr className="bg-gray-900">
                    <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white">
                      Attivi
                    </td>
                  </tr>
                  {assetGroups.map(({ tag, items }) => {
                    const groupTotal = items.reduce((s, a) => s + a.balance, 0)
                    const visibleItems = items.filter((a) => a.balance !== 0).sort((a, b) => b.balance - a.balance)
                    const key = `asset-${tag}`
                    const isCollapsed = collapsed[key]
                    return (
                      <React.Fragment key={tag}>
                        <tr className="bg-gray-100 border-t border-gray-200 cursor-pointer select-none hover:bg-gray-200/60" onClick={() => toggleGroup(key)}>
                          <td className="px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">
                            <span className="inline-flex items-center gap-1.5">
                              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                              {tag}
                            </span>
                          </td>
                          <td className="px-4 py-1.5 text-right font-mono text-xs font-semibold text-gray-600">{formatEur(groupTotal)}</td>
                          <td />
                        </tr>
                        {!isCollapsed && visibleItems.map((acc) => (
                          <AccountRow
                            key={acc.id}
                            acc={acc}
                            onEdit={() => setDialog({ type: 'edit', account: acc })}
                            onDelete={() => setDialog({ type: 'delete', account: acc })}
                          />
                        ))}
                      </React.Fragment>
                    )
                  })}
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td className="px-4 py-2.5 text-sm font-bold text-gray-900">Totale Attivi</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-bold text-gray-900">{formatEur(totalAssets)}</td>
                    <td />
                  </tr>
                </>
              )}

              {/* ── PASSIVI ── */}
              {liabilities.length > 0 && (
                <>
                  <tr className="bg-gray-900 border-t-2 border-gray-400">
                    <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white">
                      Passivi
                    </td>
                  </tr>
                  {liabilityGroups.map(({ tag, items }) => {
                    const groupTotal = items.reduce((s, a) => s + a.balance, 0)
                    const visibleItems = items.filter((a) => a.balance !== 0).sort((a, b) => a.balance - b.balance)
                    const key = `liability-${tag}`
                    const isCollapsed = collapsed[key]
                    return (
                      <React.Fragment key={tag}>
                        <tr className="bg-gray-100 border-t border-gray-200 cursor-pointer select-none hover:bg-gray-200/60" onClick={() => toggleGroup(key)}>
                          <td className="px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">
                            <span className="inline-flex items-center gap-1.5">
                              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                              {tag}
                            </span>
                          </td>
                          <td className="px-4 py-1.5 text-right font-mono text-xs font-semibold text-gray-600">{formatEur(groupTotal)}</td>
                          <td />
                        </tr>
                        {!isCollapsed && visibleItems.map((acc) => (
                          <AccountRow
                            key={acc.id}
                            acc={acc}
                            onEdit={() => setDialog({ type: 'edit', account: acc })}
                            onDelete={() => setDialog({ type: 'delete', account: acc })}
                          />
                        ))}
                      </React.Fragment>
                    )
                  })}
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td className="px-4 py-2.5 text-sm font-bold text-gray-900">Totale Passivi</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-bold text-red-600">{formatEur(totalLiabilities)}</td>
                    <td />
                  </tr>
                </>
              )}

              {/* ── PATRIMONIO NETTO ── */}
              <tr className="border-t-2 border-gray-400 bg-gray-900">
                <td className="px-4 py-3 text-sm font-bold text-white">Patrimonio Netto</td>
                <td className={`px-4 py-3 text-right font-mono text-base font-bold ${netWorth >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {formatEur(netWorth)}
                </td>
                <td />
              </tr>

            </tbody>
          </table>
        </div>
      )}

      <AllAccountsDialog
        open={showAll}
        onClose={() => setShowAll(false)}
        onEdit={(acc) => { setShowAll(false); setDialog({ type: 'edit', account: acc, fromAll: true }) }}
      />

      {/* Dialog Add/Edit */}
      <Dialog open={dialog?.type === 'add' || dialog?.type === 'edit'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.type === 'edit' ? 'Modifica conto' : 'Nuovo conto'}</DialogTitle>
            <DialogDescription>
              {dialog?.type === 'edit' ? 'Aggiorna le informazioni del conto.' : 'Inserisci nome, tipo e saldo iniziale.'}
            </DialogDescription>
          </DialogHeader>
          {(dialog?.type === 'add' || dialog?.type === 'edit') && (
            <AccountForm account={dialog?.account} onSave={handleSave} onClose={() => setDialog(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Delete */}
      <Dialog open={dialog?.type === 'delete'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina conto</DialogTitle>
          </DialogHeader>
          {dialog?.type === 'delete' && (
            <DeleteConfirmDialog account={dialog.account} onConfirm={handleDelete} onClose={() => setDialog(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AccountRow({ acc, onEdit, onDelete }) {
  return (
    <tr className="group border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
      <td className="px-4 py-2.5 pl-6 text-sm text-gray-700">{acc.name}</td>
      <td className="px-4 py-2.5 text-right">
        <span className={`font-mono text-sm font-medium ${acc.balance >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
          {formatEur(acc.balance)}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            title="Modifica"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            title="Elimina"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}
