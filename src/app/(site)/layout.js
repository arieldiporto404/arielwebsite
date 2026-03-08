import { draftMode } from 'next/headers'
import { EyeIcon } from 'lucide-react'

import { MenuContent } from '@/components/menu-content'
import { SideMenu } from '@/components/side-menu'
import { preloadGetAllPosts } from '@/lib/contentful'

export default async function SiteLayout({ children }) {
  const { isEnabled } = await draftMode()
  preloadGetAllPosts(isEnabled)

  return (
    <main vaul-drawer-wrapper="" className="min-h-screen bg-white">
      {isEnabled && (
        <div className="absolute inset-x-0 bottom-0 z-50 flex h-12 w-full items-center justify-center bg-green-500 text-center text-sm font-medium text-white">
          <div className="flex items-center gap-2">
            <EyeIcon size={16} />
            <span>Draft mode is enabled</span>
          </div>
        </div>
      )}
      <div className="lg:flex">
        <SideMenu className="relative hidden lg:flex">
          <MenuContent />
        </SideMenu>
        <div className="flex flex-1">{children}</div>
      </div>
    </main>
  )
}
