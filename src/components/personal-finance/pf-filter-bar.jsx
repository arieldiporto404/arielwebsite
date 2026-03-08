'use client'
import { PRESETS, useDateRange } from '@/lib/personal-finance/date-range-context'
import { cn } from '@/lib/utils'

export default function PfFilterBar() {
  const { preset, setPreset } = useDateRange()

  return (
    <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-gray-100 bg-white px-4">
      <span className="mr-1 text-xs font-medium text-gray-400">Periodo</span>
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => setPreset(p.id)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            preset === p.id
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
