import { Toaster } from '@/components/ui/sonner'
import { PfSidebar, PfMobileNav } from '@/components/personal-finance/pf-sidebar'
import { DateRangeProvider } from '@/lib/personal-finance/date-range-context'
import PfFilterBar from '@/components/personal-finance/pf-filter-bar'

export const metadata = {
  title: 'Personal Finance',
  robots: { index: false, follow: false }
}

export default function PersonalFinanceLayout({ children }) {
  return (
    <DateRangeProvider>
      <div className="flex h-screen overflow-hidden bg-white">
        <PfSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile top bar */}
          <header className="flex h-14 items-center border-b border-gray-200 px-4 lg:hidden">
            <PfMobileNav />
            <span className="ml-2 text-sm font-semibold tracking-tight text-gray-900">Finance</span>
          </header>
          {/* Global date filter — visible on all screens */}
          <PfFilterBar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <Toaster closeButton toastOptions={{ duration: 5000 }} />
      </div>
    </DateRangeProvider>
  )
}
