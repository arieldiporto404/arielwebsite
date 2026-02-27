'use client'

import { ArrowDownIcon, StickyNoteIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { getBookmarkItemsByPageIndex } from '@/app/actions'
import { BookmarkCard } from '@/components/bookmark-card'
import { Button } from '@/components/ui/button'
import { TWEETS_COLLECTION_ID } from '@/lib/constants'
import { cn } from '@/lib/utils'

export const BookmarkList = ({ initialData, id }) => {
  const [data, setData] = useState(initialData?.result ? initialData?.items : [])
  const [pageIndex, setPageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const loadMore = () => {
    if (!isReachingEnd && !isLoading) setPageIndex((prevPageIndex) => prevPageIndex + 1)
  }

  const fetchInfiniteData = useCallback(async () => {
    setIsLoading(true)
    const newData = await getBookmarkItemsByPageIndex(id, pageIndex)
    if (newData.result) setData((prevData) => [...prevData, ...newData.items])
    setIsLoading(false)
  }, [id, pageIndex])

  useEffect(() => {
    if (pageIndex > 0) fetchInfiniteData()
  }, [pageIndex, fetchInfiniteData])

  const isReachingEnd = data.length >= (initialData?.count ?? 0)
  const isTweetCollection = id === TWEETS_COLLECTION_ID

  return (
    <div>
      <div className={cn('grid gap-4', 'lg:grid-cols-2')}>
        {data.flatMap((bookmark, bookmarkIndex) => {
          const items = [
            <BookmarkCard
              key={bookmark._id}
              bookmark={bookmark}
              order={bookmarkIndex}
              isTweetCollection={isTweetCollection}
            />
          ]
          if (bookmark.note) {
            items.push(
              <div key={`${bookmark._id}-note`} className="thumbnail-shadow flex flex-col gap-3 rounded-xl bg-gray-50 p-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
                  <StickyNoteIcon size={13} />
                  Nota
                </span>
                <p className="text-sm leading-relaxed text-gray-700">{bookmark.note}</p>
              </div>
            )
          }
          return items
        })}
      </div>
      {data.length > 0 ? (
        <div className="mt-8 flex min-h-16 items-center justify-center text-sm lg:mt-12">
          {!isReachingEnd ? (
            <>
              {isLoading ? (
                <div
                  className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent text-black"
                  role="status"
                  aria-label="loading"
                >
                  <span className="sr-only">Loading...</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoading}
                  className="w-full justify-center bg-white"
                >
                  Load more
                  <ArrowDownIcon size={16} />
                </Button>
              )}
            </>
          ) : (
            <span>That's all for now. Come back later for more.</span>
          )}
        </div>
      ) : (
        <div className="mt-8 flex min-h-16 flex-col items-center justify-center lg:mt-12">
          <span>No bookmarks found.</span>
        </div>
      )}
    </div>
  )
}
