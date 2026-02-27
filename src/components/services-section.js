'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const CATEGORY_LABEL = {
  ordinario: 'Attività ordinarie',
  straordinario: 'Finanza straordinaria'
}

export function ServicesSection({ services, calLink }) {
  const [selected, setSelected] = useState(null)

  const ordinary = services.filter((s) => s.category === 'ordinario')
  const extraordinary = services.filter((s) => s.category === 'straordinario')

  const renderPill = (service) => (
    <button
      key={service.id}
      onClick={() => setSelected(service)}
      className="rounded-full border border-dashed border-gray-400 px-4 py-2 text-sm transition-colors hover:border-gray-700 hover:bg-gray-50 cursor-pointer"
    >
      {service.title}
    </button>
  )

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h2 className="mb-1 font-semibold tracking-tight">Cosa posso fare per te</h2>
          <p className="mb-6 text-sm text-gray-500">
            Supporto finanziario per imprenditori e PMI, sia nella gestione ordinaria che in operazioni straordinarie.
          </p>

          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
                {CATEGORY_LABEL.ordinario}
              </p>
              <div className="flex flex-wrap gap-2">{ordinary.map(renderPill)}</div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
                {CATEGORY_LABEL.straordinario}
              </p>
              <div className="flex flex-wrap gap-2">{extraordinary.map(renderPill)}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div>
            <p className="font-semibold">Prenota una call</p>
            <p className="mt-1 text-sm text-gray-500">Parliamo di come posso supportare la tua azienda.</p>
          </div>
          <Button asChild className="mt-6 w-full">
            <a href={calLink} target="_blank" rel="noopener noreferrer">
              Prenota ora →
            </a>
          </Button>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            {selected?.category && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
                {CATEGORY_LABEL[selected.category] ?? selected.category}
              </p>
            )}
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected?.short_description && (
            <p className="text-sm font-medium text-gray-700">{selected.short_description}</p>
          )}
          {selected?.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{selected.description}</p>
          )}
          <div className="mt-2">
            <Button asChild size="sm">
              <a href={calLink} target="_blank" rel="noopener noreferrer">
                Parliamone →
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
