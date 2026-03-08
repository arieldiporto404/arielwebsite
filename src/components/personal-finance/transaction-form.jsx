'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DialogFooter } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

export default function TransactionForm({ type, transaction, categories, accounts, onSave, onClose }) {
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10))
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '')
  const [subcategoryId, setSubcategoryId] = useState(transaction?.subcategory_id ?? '')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [amount, setAmount] = useState(transaction?.amount ?? '')
  const [accountId, setAccountId] = useState(transaction?.account_id ?? '')
  const [fromAccountId, setFromAccountId] = useState(transaction?.from_account_id ?? '')
  const [toAccountId, setToAccountId] = useState(transaction?.to_account_id ?? '')
  const [loading, setLoading] = useState(false)

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const subcategories = selectedCategory?.pf_subcategories ?? []

  useEffect(() => {
    setSubcategoryId('')
  }, [categoryId])

  async function handleSubmit(e) {
    e.preventDefault()
    const amountNum = parseFloat(String(amount).replace(',', '.'))
    if (!date) return toast.error('Inserisci una data')
    if (!amountNum || amountNum <= 0) return toast.error('Importo non valido')

    let payload = { date, amount: amountNum, description, type }

    if (type === 'transfer') {
      if (!fromAccountId) return toast.error('Seleziona il conto di origine')
      if (!toAccountId) return toast.error('Seleziona il conto di destinazione')
      if (fromAccountId === toAccountId) return toast.error('Origine e destinazione devono essere diversi')
      payload = { ...payload, from_account_id: fromAccountId, to_account_id: toAccountId }
    } else {
      if (!categoryId) return toast.error('Seleziona una categoria')
      if (!accountId) return toast.error('Seleziona un conto')
      payload = {
        ...payload,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        account_id: accountId
      }
    }

    setLoading(true)
    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Importo (€)</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {type === 'transfer' ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Da (conto origine)</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>A (conto destinazione)</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {type === 'expense' && subcategories.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Sottocategoria</Label>
                <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                  <SelectTrigger><SelectValue placeholder="Nessuna" /></SelectTrigger>
                  <SelectContent>
                    {subcategories.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Conto</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Descrizione</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrizione libera..." />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Annulla</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : 'Salva'}</Button>
      </DialogFooter>
    </form>
  )
}
