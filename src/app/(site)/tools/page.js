import Link from 'next/link'

import { FloatingHeader } from '@/components/floating-header'
import { PageTitle } from '@/components/page-title'
import { ScrollArea } from '@/components/scroll-area'
import { TOOLS } from '@/lib/tools'

export const metadata = {
  title: 'Tool Utili',
  description: 'Strumenti di calcolo per finanza e business.'
}

export default function ToolsPage() {
  return (
    <ScrollArea useScrollAreaId>
      <FloatingHeader scrollTitle="Tool Utili" />
      <div className="content-wrapper">
        <div className="content">
          <PageTitle title="Tool Utili" />
          <p className="mb-8 text-sm text-gray-500">
            Una raccolta di strumenti di calcolo per finanza e business.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-5 transition-colors hover:border-gray-300 hover:bg-gray-100"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    {tool.category}
                  </span>
                  <span className="text-xs text-gray-400 transition-transform group-hover:translate-x-0.5">→</span>
                </div>
                <div>
                  <h2 className="font-semibold tracking-tight">{tool.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">{tool.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
