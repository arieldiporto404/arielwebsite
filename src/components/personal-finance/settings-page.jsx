'use client'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import {
  getCategories,
  createCategory, updateCategory, deleteCategory,
  createSubcategory, updateSubcategory, deleteSubcategory,
  resetAllTransactions
} from '@/lib/personal-finance/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

// -------- Dialogs --------

function CategoryDialog({ mode, category, type, onSave, onClose }) {
  const [name, setName] = useState(category?.name ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Inserisci un nome')
    setLoading(true)
    try {
      await onSave({ name: name.trim(), type })
      onClose()
    } catch (err) {
      toast.error(err.message || 'Errore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cat-name">Nome categoria</Label>
        <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome categoria" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Annulla</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : 'Salva'}</Button>
      </DialogFooter>
    </form>
  )
}

function SubcategoryDialog({ mode, subcategory, categoryId, onSave, onClose }) {
  const [name, setName] = useState(subcategory?.name ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Inserisci un nome')
    setLoading(true)
    try {
      await onSave({ name: name.trim(), category_id: categoryId })
      onClose()
    } catch (err) {
      toast.error(err.message || 'Errore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sub-name">Nome sottocategoria</Label>
        <Input id="sub-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome sottocategoria" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Annulla</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : 'Salva'}</Button>
      </DialogFooter>
    </form>
  )
}

// -------- Category Row --------

function CategoryRow({ cat, onEditCat, onDeleteCat, onAddSub, onEditSub, onDeleteSub }) {
  const [expanded, setExpanded] = useState(false)
  const subs = cat.pf_subcategories || []

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2 p-3">
        {subs.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-gray-400 hover:text-gray-600"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        {subs.length === 0 && <div className="w-4 shrink-0" />}
        <span className="flex-1 text-sm font-medium text-gray-900">{cat.name}</span>
        <Badge variant="outline" className="text-xs text-gray-400">
          {subs.length} sub
        </Badge>
        <button onClick={() => onEditCat(cat)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDeleteCat(cat)} className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
          <Trash2 size={13} />
        </button>
        {cat.type === 'expense' && (
          <button onClick={() => onAddSub(cat.id)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <Plus size={13} />
          </button>
        )}
      </div>
      {expanded && subs.length > 0 && (
        <div className="border-t border-gray-100 px-3 pb-2">
          {subs.map((sub) => (
            <div key={sub.id} className="flex items-center gap-2 py-1.5 pl-5">
              <span className="flex-1 text-sm text-gray-600">{sub.name}</span>
              <button onClick={() => onEditSub(sub, cat.id)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <Pencil size={12} />
              </button>
              <button onClick={() => onDeleteSub(sub)} className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// -------- Reset Dialog --------

function ResetDialog({ onClose }) {
  const [step, setStep] = useState(1)
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    if (confirm !== 'RESET') return toast.error('Digita RESET per confermare')
    setLoading(true)
    try {
      await resetAllTransactions()
      toast.success('Tutte le transazioni sono state eliminate')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Errore durante il reset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {step === 1 ? (
        <>
          <p className="text-sm text-gray-700">
            Questa operazione eliminerà <strong>tutte le transazioni</strong> (entrate, uscite, trasferimenti).
            Conti, categorie e saldi storici NON verranno toccati.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button variant="destructive" onClick={() => setStep(2)}>Continua</Button>
          </DialogFooter>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-700">
            Digita <strong>RESET</strong> per confermare l&apos;eliminazione di tutte le transazioni.
          </p>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="RESET"
            className="font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>Annulla</Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={confirm !== 'RESET' || loading}
            >
              {loading ? 'Eliminazione...' : 'Elimina tutto'}
            </Button>
          </DialogFooter>
        </>
      )}
    </div>
  )
}

// -------- Main --------

export default function SettingsPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null)
  const [showReset, setShowReset] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (err) {
      toast.error('Errore nel caricamento delle categorie')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSaveCat(values) {
    if (dialog?.category) {
      await updateCategory(dialog.category.id, values)
      toast.success('Categoria aggiornata')
    } else {
      await createCategory(values)
      toast.success('Categoria creata')
    }
    await load()
  }

  async function handleDeleteCat(cat) {
    await deleteCategory(cat.id)
    toast.success('Categoria eliminata')
    await load()
  }

  async function handleSaveSub(values) {
    if (dialog?.subcategory) {
      await updateSubcategory(dialog.subcategory.id, values)
      toast.success('Sottocategoria aggiornata')
    } else {
      await createSubcategory(values)
      toast.success('Sottocategoria creata')
    }
    await load()
  }

  async function handleDeleteSub(sub) {
    await deleteSubcategory(sub.id)
    toast.success('Sottocategoria eliminata')
    await load()
  }

  const incomeCategories = categories.filter((c) => c.type === 'income')
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Impostazioni</h1>
        <p className="mt-1 text-sm text-gray-500">Gestisci categorie, sottocategorie e dati</p>
      </div>

      <Tabs defaultValue="income">
        <TabsList className="mb-4">
          <TabsTrigger value="income">Entrate</TabsTrigger>
          <TabsTrigger value="expense">Uscite</TabsTrigger>
          <TabsTrigger value="reset" className="text-red-500">Reset dati</TabsTrigger>
        </TabsList>

        {/* Income */}
        <TabsContent value="income">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Categorie entrate</p>
            <Button size="sm" variant="outline" onClick={() => setDialog({ type: 'add-cat', catType: 'income' })}>
              <Plus size={14} className="mr-1" /> Aggiungi
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Caricamento...</p>
          ) : (
            <div className="flex flex-col gap-2">
              {incomeCategories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  onEditCat={(c) => setDialog({ type: 'edit-cat', category: c, catType: 'income' })}
                  onDeleteCat={(c) => { handleDeleteCat(c) }}
                  onAddSub={() => {}}
                  onEditSub={() => {}}
                  onDeleteSub={() => {}}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expense */}
        <TabsContent value="expense">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Categorie uscite</p>
            <Button size="sm" variant="outline" onClick={() => setDialog({ type: 'add-cat', catType: 'expense' })}>
              <Plus size={14} className="mr-1" /> Aggiungi
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Caricamento...</p>
          ) : (
            <div className="flex flex-col gap-2">
              {expenseCategories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  onEditCat={(c) => setDialog({ type: 'edit-cat', category: c, catType: 'expense' })}
                  onDeleteCat={(c) => { handleDeleteCat(c) }}
                  onAddSub={(catId) => setDialog({ type: 'add-sub', categoryId: catId })}
                  onEditSub={(sub, catId) => setDialog({ type: 'edit-sub', subcategory: sub, categoryId: catId })}
                  onDeleteSub={(sub) => { handleDeleteSub(sub) }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reset */}
        <TabsContent value="reset">
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <h3 className="font-semibold tracking-tight text-red-800">Reset dati transazioni</h3>
            <p className="mt-1 text-sm text-red-600">
              Elimina tutte le transazioni in modo permanente. Conti, categorie e saldi storici non vengono toccati.
            </p>
            <Button variant="destructive" className="mt-4" onClick={() => setShowReset(true)}>
              Reset transazioni
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs categoria */}
      <Dialog
        open={dialog?.type === 'add-cat' || dialog?.type === 'edit-cat'}
        onOpenChange={() => setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.type === 'edit-cat' ? 'Modifica categoria' : 'Nuova categoria'}</DialogTitle>
            <DialogDescription>
              {dialog?.type === 'edit-cat' ? 'Aggiorna il nome della categoria.' : 'Crea una nuova categoria.'}
            </DialogDescription>
          </DialogHeader>
          {(dialog?.type === 'add-cat' || dialog?.type === 'edit-cat') && (
            <CategoryDialog
              mode={dialog.type}
              category={dialog?.category}
              type={dialog?.catType}
              onSave={handleSaveCat}
              onClose={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogs sottocategoria */}
      <Dialog
        open={dialog?.type === 'add-sub' || dialog?.type === 'edit-sub'}
        onOpenChange={() => setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.type === 'edit-sub' ? 'Modifica sottocategoria' : 'Nuova sottocategoria'}</DialogTitle>
          </DialogHeader>
          {(dialog?.type === 'add-sub' || dialog?.type === 'edit-sub') && (
            <SubcategoryDialog
              mode={dialog.type}
              subcategory={dialog?.subcategory}
              categoryId={dialog?.categoryId}
              onSave={handleSaveSub}
              onClose={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset dialog */}
      <Dialog open={showReset} onOpenChange={() => setShowReset(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Conferma reset</DialogTitle>
          </DialogHeader>
          <ResetDialog onClose={() => setShowReset(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
