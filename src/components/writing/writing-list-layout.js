'use client'

import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'

import { WritingLink } from '@/components/writing-link'
import { useViewData } from '@/hooks/useViewData'
import { cn } from '@/lib/utils'

export const WritingListLayout = ({ list, isMobile }) => {
  const viewData = useViewData()
  const pathname = usePathname()
  const [selectedTag, setSelectedTag] = useState(null)

  const allTags = useMemo(() => {
    const tags = new Set()
    list.forEach((post) => post.tags?.forEach((tag) => tags.add(tag)))
    return Array.from(tags).sort()
  }, [list])

  const filteredList = useMemo(() => {
    if (!selectedTag) return list
    return list.filter((post) => post.tags?.includes(selectedTag))
  }, [list, selectedTag])

  const memoizedList = useMemo(() => {
    return filteredList.map((post) => {
      const viewCount = viewData?.find((item) => item.slug === post.slug)?.view_count
      const isActive = pathname === `/writing/${post.slug}`

      return <WritingLink key={post.slug} post={post} viewCount={viewCount} isMobile={isMobile} isActive={isActive} />
    })
  }, [filteredList, viewData, pathname, isMobile])

  return (
    <div className={cn(!isMobile && 'flex flex-col gap-1 text-sm')}>
      {allTags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1 px-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={cn(
                'rounded-full px-2 py-0.5 text-xs transition-colors',
                selectedTag === tag ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      {memoizedList}
    </div>
  )
}
