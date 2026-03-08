import { Suspense } from 'react'

import { ListItem } from '@/components/list-item'
import { ScreenLoadingSpinner } from '@/components/screen-loading-spinner'
import { SideMenu } from '@/components/side-menu'
import { Toaster } from '@/components/ui/sonner'
import { getBookmarks, getBookmarksTree } from '@/lib/raindrop'

async function fetchData() {
  const [bookmarks, tree] = await Promise.all([getBookmarks(), getBookmarksTree()])
  return { bookmarks, tree }
}

export default async function BookmarksLayout({ children }) {
  const { bookmarks, tree } = await fetchData()

  return (
    <>
      <div className="flex w-full">
        <SideMenu title="Bookmarks" bookmarks={bookmarks} isInner>
          <Suspense fallback={<ScreenLoadingSpinner />}>
            <div className="flex flex-col gap-1 text-sm">
              {tree.map((root) => {
                if (root.children.length > 0) {
                  return (
                    <div key={root._id}>
                      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
                        {root.title}
                      </p>
                      <div className="ml-2 flex flex-col gap-1">
                        {root.children.map((child) => (
                          <ListItem
                            key={child._id}
                            path={`/bookmarks/${child.slug}`}
                            title={child.title}
                            description={`${child.count} bookmarks`}
                          />
                        ))}
                      </div>
                    </div>
                  )
                }
                return (
                  <ListItem
                    key={root._id}
                    path={`/bookmarks/${root.slug}`}
                    title={root.title}
                    description={`${root.count} bookmarks`}
                  />
                )
              })}
            </div>
          </Suspense>
        </SideMenu>
        <div className="lg:bg-grid flex-1">{children}</div>
      </div>
      <Toaster
        closeButton
        toastOptions={{
          duration: 5000
        }}
      />
    </>
  )
}

export const viewport = {
  //  To fix the zoom issue on mobile for the bookmark submit form
  maximumScale: 1
}
