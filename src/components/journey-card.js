'use client'

import dynamic from 'next/dynamic'
import { memo } from 'react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const MarkdownRenderer = dynamic(() => import('@/components/markdown-renderer').then((mod) => mod.MarkdownRenderer))

export const JourneyCard = memo(({ title, description, long_description, image, index }) => {
  return (
    <div className="word-break-word flex flex-col">
      {long_description ? (
        <Dialog>
          <DialogTrigger asChild>
            <button className="mb-px text-left font-semibold tracking-tight hover:underline cursor-pointer">
              {title}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <MarkdownRenderer className="text-sm" options={{ forceInline: false }}>
              {long_description}
            </MarkdownRenderer>
          </DialogContent>
        </Dialog>
      ) : (
        <span className="mb-px font-semibold tracking-tight">{title}</span>
      )}
      {description && (
        <MarkdownRenderer
          className="text-sm"
          options={{
            forceInline: true
          }}
        >
          {description}
        </MarkdownRenderer>
      )}
      {image?.url && (
        <div className="mt-2.5 overflow-hidden rounded-xl bg-white">
          <img
            src={image.url}
            alt={image.title || image.description}
            width={image.width}
            height={image.height}
            loading={index < 1 ? 'eager' : 'lazy'}
            className="animate-reveal"
            // eslint-disable-next-line react/no-unknown-property
            nopin="nopin"
          />
        </div>
      )}
    </div>
  )
})
JourneyCard.displayName = 'JourneyCard'
