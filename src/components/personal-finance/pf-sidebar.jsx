'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { href: '/personal-finance', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/personal-finance/transactions', label: 'Transazioni', icon: ArrowLeftRight },
  { href: '/personal-finance/accounts', label: 'Conti', icon: Wallet },
  { href: '/personal-finance/wealth', label: 'Patrimonio', icon: TrendingUp },
  { href: '/personal-finance/settings', label: 'Impostazioni', icon: Settings }
]

function NavItem({ item, collapsed }) {
  const pathname = usePathname()
  const isActive =
    item.href === '/personal-finance'
      ? pathname === '/personal-finance'
      : pathname.startsWith(item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
        isActive
          ? 'bg-gray-900 text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

// Sidebar desktop collassabile
export function PfSidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative hidden h-screen flex-col border-r border-gray-200 bg-zinc-50 transition-all duration-200 lg:flex',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Header */}
      <div className={cn('flex h-14 items-center border-b border-gray-200 px-4', collapsed && 'justify-center px-2')}>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-gray-900">Finance</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'ml-auto rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600',
            collapsed && 'ml-0'
          )}
          aria-label={collapsed ? 'Espandi sidebar' : 'Comprimi sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  )
}

// Trigger mobile (hamburger) + Sheet
export function PfMobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-56 p-0">
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <span className="text-sm font-semibold tracking-tight text-gray-900">Finance</span>
        </div>
        <nav className="flex flex-col gap-1 p-2" onClick={() => setOpen(false)}>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} collapsed={false} />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
