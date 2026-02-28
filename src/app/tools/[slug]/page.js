import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import { RichText } from '@/components/contentful/rich-text'
import { FloatingHeader } from '@/components/floating-header'
import { ScrollArea } from '@/components/scroll-area'
import { EquityStory } from '@/components/tools/equity-story'
import { getToolPage } from '@/lib/contentful'
import { TOOLS } from '@/lib/tools'
import { isDevelopment } from '@/lib/utils'

export async function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const tool = TOOLS.find((t) => t.slug === slug)
  if (!tool) return {}
  const contentfulData = await getToolPage(slug)
  return {
    title: contentfulData?.title || tool.title,
    description: contentfulData?.description || tool.description
  }
}

const TOOL_COMPONENTS = {
  'equity-story': EquityStory
}

export default async function ToolPage({ params }) {
  const { slug } = await params
  const tool = TOOLS.find((t) => t.slug === slug)
  if (!tool) notFound()

  const ToolComponent = TOOL_COMPONENTS[slug]
  if (!ToolComponent) notFound()

  const { isEnabled } = await draftMode()
  const contentfulData = await getToolPage(slug, isDevelopment ? true : isEnabled)

  const title = contentfulData?.title || tool.title
  const description = contentfulData?.description || tool.description
  const howToUse = contentfulData?.howToUse ?? null
  const faq = contentfulData?.faq ?? null

  return (
    <ScrollArea useScrollAreaId>
      <FloatingHeader scrollTitle={title} />
      <div className="content-wrapper">

        {/* 1. Header */}
        <div className="content">
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-gray-500">{description}</p>
        </div>

        {/* 2. Componente interattivo */}
        <div className="mt-6 px-6 lg:px-8">
          <ToolComponent />
        </div>

        {/* 3. Come si usa — Contentful rich text, o fallback array statico da tools.js */}
        {(howToUse || tool.instructions) && (
          <div className="content mt-12">
            <h2 className="mb-4 font-semibold tracking-tight">Come si usa</h2>
            {howToUse ? (
              <RichText content={howToUse} />
            ) : (
              <ol className="flex flex-col gap-2">
                {tool.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-500">
                    <span className="mt-px shrink-0 font-semibold tabular-nums text-gray-400">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* 4. FAQ — opzionale, solo se presente su Contentful */}
        {faq && (
          <div className="content mt-12">
            <h2 className="mb-4 font-semibold tracking-tight">FAQ</h2>
            <RichText content={faq} />
          </div>
        )}

      </div>
    </ScrollArea>
  )
}
