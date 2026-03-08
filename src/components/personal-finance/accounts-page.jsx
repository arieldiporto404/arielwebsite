'use client'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { getAccountsWithBalance, createAccount, updateAccount, deleteAccount } from '@/lib/personal-finance/queries'
import { formatEur } from '@/lib/personal-finance/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'

function AccountForm({ account, onSave, onClose }) {
  const [name, setName] = useState(account?.name ?? '')
  const [initialBalance, setInitialBalance] = useState(account?.initial_balance ?? 0)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Inserisci un nome per il conto')
    setLoading(true)
    try {
      await onSave({ name: name.trim(), initial_balance: parseFloat(String(initialBalance).replace(',', '.')) || 0 })
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null) // { type: 'add'|'edit'|'delete', account? }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAccountsWithBalance()
      setAccounts(data)
    } catch (err) {
      toast.error('Errore nel caricamento dei conti')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(values) {
    if (dialog?.account) {
      await updateAccount(dialog.account.id, values)
      toast.success('Conto aggiornato')
    } else {
      await createAccount(values)
      toast.success('Conto creato')
    }
    await load()
  }

  async function handleDelete() {
    await deleteAccount(dialog.account.id)
    toast.success('Conto eliminato')
    await load()
  }

  const totalWealth = accounts.reduce((sum, a) => sum + a.current_balance, 0)

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Conti</h1>
          <p className="mt-1 text-sm text-gray-500">Gestisci i tuoi conti e visualizza i saldi</p>
        </div>
        <Button onClick={() => setDialog({ type: 'add' })}>
          <Plus size={16} className="mr-1.5" />
          Nuovo conto
        </Button>
      </div>

      {/* Patrimonio totale */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Patrimonio totale</p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-gray-900">
          {formatEur(totalWealth)}
        </p>
      </div>

      {/* Lista conti */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">Caricamento...</div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-sm text-gray-400">
          <p>Nessun conto trovato</p>
          <Button variant="outline" className="mt-4" onClick={() => setDialog({ type: 'add' })}>
            <Plus size={16} className="mr-1.5" /> Crea il primo conto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold tracking-tight text-gray-900">{acc.name}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Saldo iniziale: {formatEur(acc.initial_balance)}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setDialog({ type: 'edit', account: acc })}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Modifica"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDialog({ type: 'delete', account: acc })}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    title="Elimina"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className={`mt-3 font-mono text-xl font-semibold ${acc.current_balance >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                {formatEur(acc.current_balance)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Dialog Add/Edit */}
      <Dialog open={dialog?.type === 'add' || dialog?.type === 'edit'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.type === 'edit' ? 'Modifica conto' : 'Nuovo conto'}</DialogTitle>
            <DialogDescription>
              {dialog?.type === 'edit' ? 'Aggiorna le informazioni del conto.' : 'Inserisci nome e saldo iniziale.'}
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
