'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Upload, Download, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import {
  getTransactions, deleteTransaction, getCategories, getAccounts
} from '@/lib/personal-finance/queries'
import { formatEur, formatDate } from '@/lib/personal-finance/formatters'
import { useDateRange } from '@/lib/personal-finance/date-range-context'
import TransactionForm from './transaction-form'
import ImportModal from './import-modal'
import supabase from '@/lib/personal-finance/supabase'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'income',   label: 'Entrate' },
  { id: 'expense',  label: 'Uscite' },
  { id: 'transfer', label: 'Trasferimenti' },
]

async function fetchCount(type, dateFrom, dateTo) {
  let q = supabase
    .from('pf_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('type', type)
  if (dateFrom) q = q.gte('date', dateFrom)
  if (dateTo)   q = q.lte('date', dateTo)
  const { count } = await q
  return count ?? 0
}

function exportCSV(rows, type) {
  let headers, lines
  if (type === 'transfer') {
    headers = 'Data,Da,A,Importo,Descrizione'
    lines = rows.map((r) => [
      formatDate(r.date),
      r.from_account?.name ?? '',
      r.to_account?.name ?? '',
      r.amount,
      r.description ?? '',
    ].join(','))
  } else {
    headers = 'Data,Categoria,Sottocategoria,Conto,Importo,Descrizione'
    lines = rows.map((r) => [
      formatDate(r.date),
      r.pf_categories?.name ?? '',
      r.pf_subcategories?.name ?? '',
      r.account?.name ?? '',
      r.amount,
      r.description ?? '',
    ].join(','))
  }
  const csv = [headers, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transazioni-${type}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Header ordinabile
function SortHead({ label, col, sortKey, sortDir, onSort, className }) {
  const active = sortKey === col
  const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <TableHead
      className={cn('cursor-pointer select-none text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-700', className)}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon size={11} className={active ? 'text-gray-700' : 'text-gray-300'} />
      </span>
    </TableHead>
  )
}

export default function TransactionsView() {
  const { dateFrom, dateTo } = useDateRange()

  const [activeTab, setActiveTab]   = useState('income')
  const [rows, setRows]             = useState([])
  const [counts, setCounts]         = useState({ income: 0, expense: 0, transfer: 0 })
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(new Set())
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts]     = useState([])
  const [dialog, setDialog]         = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Ordinamento
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  // Filtri
  const [filterCat,    setFilterCat]    = useState('all')
  const [filterSubcat, setFilterSubcat] = useState('all')
  const [filterAcc,    setFilterAcc]    = useState('all')

  useEffect(() => {
    Promise.all([getCategories(), getAccounts()]).then(([cats, accs]) => {
      setCategories(cats)
      setAccounts(accs)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const [{ data }, incomeCount, expenseCount, transferCount] = await Promise.all([
        getTransactions({ type: activeTab, dateFrom, dateTo, page: 1, pageSize: 500 }),
        fetchCount('income',   dateFrom, dateTo),
        fetchCount('expense',  dateFrom, dateTo),
        fetchCount('transfer', dateFrom, dateTo),
      ])
      setRows(data ?? [])
      setCounts({ income: incomeCount, expense: expenseCount, transfer: transferCount })
    } catch {
      toast.error('Errore nel caricamento transazioni')
    } finally {
      setLoading(false)
    }
  }, [activeTab, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  // Reset filtri al cambio tab
  useEffect(() => {
    setFilterCat('all')
    setFilterSubcat('all')
    setFilterAcc('all')
  }, [activeTab])

  // Reset sottocategoria al cambio categoria
  useEffect(() => { setFilterSubcat('all') }, [filterCat])

  // Ordinamento + filtro client-side
  const visibleRows = useMemo(() => {
    let out = rows

    if (filterCat !== 'all')    out = out.filter((r) => r.category_id === filterCat)
    if (filterSubcat !== 'all') out = out.filter((r) => r.subcategory_id === filterSubcat)
    if (filterAcc !== 'all') {
      if (activeTab === 'transfer') {
        out = out.filter((r) => r.from_account_id === filterAcc || r.to_account_id === filterAcc)
      } else {
        out = out.filter((r) => r.account_id === filterAcc)
      }
    }

    return [...out].sort((a, b) => {
      let av, bv
      if (sortKey === 'date') {
        av = a.date; bv = b.date
      } else {
        av = Number(a.amount); bv = Number(b.amount)
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, sortKey, sortDir, filterCat, filterSubcat, filterAcc])

  function handleSort(col) {
    if (sortKey === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('desc') }
  }

  const toggleAll = () => {
    setSelected(selected.size === visibleRows.length ? new Set() : new Set(visibleRows.map((r) => r.id)))
  }
  const toggleOne = (id) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  async function handleDelete(tx) {
    try {
      await deleteTransaction(tx.id)
      toast.success('Transazione eliminata')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  // Opzioni filtro categoria (del tipo corrente)
  const catOptions = categories.filter((c) => c.type === activeTab)

  // Opzioni sottocategoria (filtrate per categoria selezionata)
  const subcatOptions = useMemo(() => {
    if (filterCat === 'all') {
      return catOptions.flatMap((c) => c.pf_subcategories ?? [])
    }
    return catOptions.find((c) => c.id === filterCat)?.pf_subcategories ?? []
  }, [catOptions, filterCat])

  const hasFilters = filterCat !== 'all' || filterSubcat !== 'all' || filterAcc !== 'all'

  const isExpense   = activeTab === 'expense'
  const isTransfer  = activeTab === 'transfer'

  return (
    <div className="flex flex-col">

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6">
        <nav className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                activeTab === tab.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 py-2">
          <Button size="sm" variant="outline" onClick={() => exportCSV(visibleRows, activeTab)} disabled={visibleRows.length === 0}>
            <Download size={14} className="mr-1.5" /> Esporta
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialog({ type: 'import' })}>
            <Upload size={14} className="mr-1.5" /> Importa
          </Button>
          <Button size="sm" onClick={() => setDialog({ type: 'add' })}>
            <Plus size={14} className="mr-1.5" /> Aggiungi
          </Button>
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-6 py-2">
        <span className="text-xs font-medium text-gray-400">Filtra per</span>

        {!isTransfer && (
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="h-7 w-40 border-gray-200 bg-white text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {catOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {!isTransfer && subcatOptions.length > 0 && (
          <Select value={filterSubcat} onValueChange={setFilterSubcat}>
            <SelectTrigger className="h-7 w-44 border-gray-200 bg-white text-xs">
              <SelectValue placeholder="Sottocategoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le sottocategorie</SelectItem>
              {subcatOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterAcc} onValueChange={setFilterAcc}>
          <SelectTrigger className="h-7 w-36 border-gray-200 bg-white text-xs">
            <SelectValue placeholder="Conto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i conti</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={() => { setFilterCat('all'); setFilterSubcat('all'); setFilterAcc('all') }}
            className="flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-300"
          >
            <X size={10} /> Reset filtri
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400 tabular-nums">
          {visibleRows.length} {visibleRows.length !== rows.length ? `/ ${rows.length} ` : ''}righe
        </span>
      </div>

      {/* ── Tabella ─────────────────────────────────────────────────────── */}
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 bg-gray-50 hover:bg-gray-50">
              <TableHead className="w-12 pl-6">
                <Checkbox
                  checked={visibleRows.length > 0 && selected.size === visibleRows.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <SortHead label="Data" col="date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28" />
              {isTransfer ? (
                <>
                  <TableHead className="text-xs font-semibold uppercase tracking-widest text-gray-400">Da</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-widest text-gray-400">A</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-xs font-semibold uppercase tracking-widest text-gray-400">Categoria</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-widest text-gray-400">Sottocategoria</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-widest text-gray-400">Conto</TableHead>
                </>
              )}
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-gray-400">Descrizione</TableHead>
              <SortHead label="Importo" col="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-gray-100">
                    <TableCell className="pl-6"><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              : visibleRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`border-gray-100 transition-colors ${
                      selected.has(row.id) ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <TableCell className="pl-6">
                      <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleOne(row.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{formatDate(row.date)}</TableCell>
                    {isTransfer ? (
                      <>
                        <TableCell className="text-gray-700 font-medium">
                          {row.from_account?.name ?? <span className="text-gray-300">—</span>}
                        </TableCell>
                        <TableCell className="text-gray-700 font-medium">
                          {row.to_account?.name ?? <span className="text-gray-300">—</span>}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium text-gray-800">
                          {row.pf_categories?.name ?? <span className="text-gray-300">—</span>}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {row.pf_subcategories?.name ?? <span className="text-gray-300">—</span>}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {row.account?.name ?? <span className="text-gray-300">—</span>}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="max-w-xs truncate text-gray-500">
                      {row.description ?? <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${isExpense ? 'text-red-500' : isTransfer ? 'text-blue-600' : 'text-green-600'}`}>
                      {formatEur(row.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDialog({ type: 'edit', transaction: row })}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(row)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
            }
            {!loading && visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={isTransfer ? 7 : 8} className="py-12 text-center text-sm text-gray-400">
                  {hasFilters ? 'Nessuna transazione con i filtri applicati' : 'Nessuna transazione nel periodo selezionato'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <Dialog open={dialog?.type === 'add' || dialog?.type === 'edit'} onOpenChange={(open) => { if (!open) setDialog(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog?.type === 'add' ? 'Nuova transazione' : 'Modifica transazione'}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            type={dialog?.transaction?.type ?? activeTab}
            transaction={dialog?.transaction}
            categories={categories}
            accounts={accounts}
            onSave={() => { setDialog(null); load() }}
            onClose={() => setDialog(null)}
          />
        </DialogContent>
      </Dialog>

      {dialog?.type === 'import' && (
        <ImportModal
          accounts={accounts}
          categories={categories}
          onClose={() => setDialog(null)}
          onImported={() => { setDialog(null); load() }}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Elimina transazione</DialogTitle>
            <DialogDescription>Sei sicuro? L&apos;operazione non è reversibile.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Annulla</Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(deleteTarget)}>Elimina</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
