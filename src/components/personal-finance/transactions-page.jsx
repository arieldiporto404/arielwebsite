'use client'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Upload, Download, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  getCategories, getAccounts, resetAllTransactions
} from '@/lib/personal-finance/queries'
import { formatEur, formatDate } from '@/lib/personal-finance/formatters'
import { useDateRange } from '@/lib/personal-finance/date-range-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import TransactionForm from './transaction-form'
import ImportModal from './import-modal'

const PAGE_SIZE = 500

function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronsUpDown size={13} className="ml-1 text-gray-300" />
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="ml-1" />
    : <ChevronDown size={13} className="ml-1" />
}

function exportCSV(rows, type) {
  let headers, lines
  if (type === 'income') {
    headers = 'Data,Categoria,Descrizione,Importo,Conto'
    lines = rows.map((r) =>
      [formatDate(r.date), r.pf_categories?.name, r.description, r.amount, r.account?.name].join(',')
    )
  } else if (type === 'expense') {
    headers = 'Data,Categoria,Sottocategoria,Descrizione,Importo,Conto'
    lines = rows.map((r) =>
      [formatDate(r.date), r.pf_categories?.name, r.pf_subcategories?.name, r.description, r.amount, r.account?.name].join(',')
    )
  } else {
    headers = 'Data,Da,A,Descrizione,Importo'
    lines = rows.map((r) =>
      [formatDate(r.date), r.from_account?.name, r.to_account?.name, r.description, r.amount].join(',')
    )
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

function TransactionsTab({ type, categories, accounts, defaultDateFrom, defaultDateTo }) {
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  // Filters — inizializzati dal filtro globale
  const [dateFrom, setDateFrom] = useState(defaultDateFrom ?? '')
  const [dateTo, setDateTo] = useState(defaultDateTo ?? '')
  const [filterCat, setFilterCat] = useState('')
  const [filterAcc, setFilterAcc] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')

  // Dialogs
  const [dialog, setDialog] = useState(null) // { type: 'add'|'edit'|'delete'|'import', transaction? }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count } = await getTransactions({
        type,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        categoryId: filterCat || undefined,
        accountId: filterAcc || undefined,
        amountMin: amountMin ? parseFloat(amountMin) : undefined,
        amountMax: amountMax ? parseFloat(amountMax) : undefined,
        page,
        pageSize: PAGE_SIZE
      })
      // Sort client-side (Supabase already orders by date desc)
      let sorted = [...(data || [])]
      sorted.sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey]
        if (typeof av === 'string') av = av.toLowerCase()
        if (typeof bv === 'string') bv = bv.toLowerCase()
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
      setRows(sorted)
      setCount(count || 0)
    } catch (err) {
      toast.error('Errore nel caricamento transazioni')
    } finally {
      setLoading(false)
    }
  }, [type, dateFrom, dateTo, filterCat, filterAcc, amountMin, amountMax, page, sortKey, sortDir])

  useEffect(() => { load() }, [load])

  function handleSort(col) {
    if (sortKey === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  async function handleSave(payload) {
    if (dialog?.transaction) {
      await updateTransaction(dialog.transaction.id, payload)
      toast.success('Transazione aggiornata')
    } else {
      await createTransaction(payload)
      toast.success('Transazione creata')
    }
    await load()
  }

  async function handleDelete() {
    await deleteTransaction(dialog.transaction.id)
    toast.success('Transazione eliminata')
    setDialog(null)
    await load()
  }

  const filteredCats = categories.filter((c) =>
    type === 'income' ? c.type === 'income' : c.type === 'expense'
  )

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Da</label>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">A</label>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="h-8 text-xs" />
        </div>
        {type !== 'transfer' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Categoria</label>
            <Select value={filterCat} onValueChange={(v) => { setFilterCat(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Tutte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                {filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Conto</label>
          <Select value={filterAcc} onValueChange={(v) => { setFilterAcc(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Tutti" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Importo min</label>
          <Input type="number" value={amountMin} onChange={(e) => { setAmountMin(e.target.value); setPage(1) }} placeholder="0" className="h-8 w-24 text-xs" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Importo max</label>
          <Input type="number" value={amountMax} onChange={(e) => { setAmountMax(e.target.value); setPage(1) }} placeholder="∞" className="h-8 w-24 text-xs" />
        </div>
        <div className="ml-auto flex items-end gap-2">
          <Button size="sm" variant="outline" onClick={() => exportCSV(rows, type)}>
            <Download size={14} className="mr-1" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialog({ type: 'import' })}>
            <Upload size={14} className="mr-1" /> Importa
          </Button>
          <Button size="sm" onClick={() => setDialog({ type: 'add' })}>
            <Plus size={14} className="mr-1" /> Aggiungi
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button className="flex items-center" onClick={() => handleSort('date')}>
                  Data <SortIcon col="date" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              {type !== 'transfer' && (
                <TableHead>
                  <button className="flex items-center" onClick={() => handleSort('pf_categories.name')}>
                    Categoria <SortIcon col="pf_categories.name" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </TableHead>
              )}
              {type === 'expense' && <TableHead>Sottocategoria</TableHead>}
              {type === 'transfer' && (
                <>
                  <TableHead>Da</TableHead>
                  <TableHead>A</TableHead>
                </>
              )}
              <TableHead>Descrizione</TableHead>
              <TableHead className="text-right">
                <button className="flex items-center justify-end w-full" onClick={() => handleSort('amount')}>
                  Importo <SortIcon col="amount" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              {type !== 'transfer' && <TableHead>Conto</TableHead>}
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-gray-400">Caricamento...</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-gray-400">Nessuna transazione trovata</TableCell>
              </TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => setDialog({ type: 'edit', transaction: r })}>
                <TableCell className="text-sm">{formatDate(r.date)}</TableCell>
                {type !== 'transfer' && <TableCell className="text-sm">{r.pf_categories?.name ?? '-'}</TableCell>}
                {type === 'expense' && <TableCell className="text-xs text-gray-500">{r.pf_subcategories?.name ?? '-'}</TableCell>}
                {type === 'transfer' && (
                  <>
                    <TableCell className="text-sm">{r.from_account?.name ?? '-'}</TableCell>
                    <TableCell className="text-sm">{r.to_account?.name ?? '-'}</TableCell>
                  </>
                )}
                <TableCell className="max-w-48 truncate text-sm text-gray-500">{r.description ?? '-'}</TableCell>
                <TableCell className="text-right font-mono text-sm font-medium">{formatEur(r.amount)}</TableCell>
                {type !== 'transfer' && <TableCell className="text-xs text-gray-400">{r.account?.name ?? '-'}</TableCell>}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setDialog({ type: 'delete', transaction: r })}
                    className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Count + Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>{count} transazioni</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>Precedente</Button>
            <span>Pag. {page} di {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>Successiva</Button>
          </div>
        )}
      </div>

      {/* Dialog Add/Edit */}
      <Dialog open={dialog?.type === 'add' || dialog?.type === 'edit'} onOpenChange={() => setDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === 'edit' ? 'Modifica transazione' : 'Nuova transazione'}
            </DialogTitle>
            <DialogDescription>
              {type === 'income' ? 'Entrata' : type === 'expense' ? 'Uscita' : 'Trasferimento'}
            </DialogDescription>
          </DialogHeader>
          {(dialog?.type === 'add' || dialog?.type === 'edit') && (
            <TransactionForm
              type={type}
              transaction={dialog?.transaction}
              categories={filteredCats}
              accounts={accounts}
              onSave={handleSave}
              onClose={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Delete */}
      <Dialog open={dialog?.type === 'delete'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina transazione</DialogTitle>
            <DialogDescription>
              {dialog?.transaction && `${formatDate(dialog.transaction.date)} — ${formatEur(dialog.transaction.amount)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">Questa operazione è irreversibile.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>Annulla</Button>
              <Button variant="destructive" onClick={handleDelete}>Elimina</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Import */}
      <Dialog open={dialog?.type === 'import'} onOpenChange={() => setDialog(null)}>
        <DialogContent className="flex flex-col sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Importa {type === 'income' ? 'entrate' : type === 'expense' ? 'uscite' : 'trasferimenti'}</DialogTitle>
          </DialogHeader>
          {dialog?.type === 'import' && (
            <ImportModal
              type={type}
              categories={categories}
              accounts={accounts}
              onImported={load}
              onClose={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function TransactionsPage() {
  const { dateFrom, dateTo, preset } = useDateRange()
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [resetKey, setResetKey] = useState(0)
  const [resetDialog, setResetDialog] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    Promise.all([getCategories(), getAccounts()])
      .then(([cats, accs]) => { setCategories(cats); setAccounts(accs) })
      .catch(() => toast.error('Errore nel caricamento dati'))
      .finally(() => setLoading(false))
  }, [])

  async function handleReset() {
    setResetting(true)
    try {
      await resetAllTransactions()
      toast.success('Tutti i dati sono stati eliminati')
      setResetDialog(false)
      setResetConfirm('')
      setResetKey((k) => k + 1)
    } catch (err) {
      toast.error(err.message || 'Errore durante il reset')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">Caricamento...</div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Transazioni</h1>
          <p className="mt-1 text-sm text-gray-500">Gestisci entrate, uscite e trasferimenti</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          onClick={() => { setResetConfirm(''); setResetDialog(true) }}
        >
          <Trash2 size={13} className="mr-1" /> Svuota dati
        </Button>
      </div>

      <Tabs defaultValue="income">
        <TabsList className="mb-4">
          <TabsTrigger value="income">Entrate</TabsTrigger>
          <TabsTrigger value="expense">Uscite</TabsTrigger>
          <TabsTrigger value="transfer">Trasferimenti</TabsTrigger>
        </TabsList>
        <TabsContent value="income">
          <TransactionsTab key={`income-${preset}-${resetKey}`} type="income" categories={categories} accounts={accounts} defaultDateFrom={dateFrom} defaultDateTo={dateTo} />
        </TabsContent>
        <TabsContent value="expense">
          <TransactionsTab key={`expense-${preset}-${resetKey}`} type="expense" categories={categories} accounts={accounts} defaultDateFrom={dateFrom} defaultDateTo={dateTo} />
        </TabsContent>
        <TabsContent value="transfer">
          <TransactionsTab key={`transfer-${preset}-${resetKey}`} type="transfer" categories={categories} accounts={accounts} defaultDateFrom={dateFrom} defaultDateTo={dateTo} />
        </TabsContent>
      </Tabs>

      <Dialog open={resetDialog} onOpenChange={(open) => { if (!open) setResetDialog(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Svuota tutti i dati</DialogTitle>
            <DialogDescription>
              Questa operazione elimina <strong>tutte le transazioni</strong> in modo permanente. Non è reversibile.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Scrivi <span className="font-mono font-semibold">RESET</span> per confermare.
            </p>
            <Input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET"
              className="font-mono"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetDialog(false)} disabled={resetting}>Annulla</Button>
              <Button
                variant="destructive"
                disabled={resetConfirm !== 'RESET' || resetting}
                onClick={handleReset}
              >
                {resetting ? 'Eliminazione...' : 'Elimina tutto'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
