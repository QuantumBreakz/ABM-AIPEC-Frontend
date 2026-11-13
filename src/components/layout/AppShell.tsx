import * as Dialog from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router'
import { BrandMark } from '../BrandMark'
import { Button } from '../ui/button'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

function Brand() {
  return (
    <div className="flex items-center gap-3 px-4">
      <BrandMark />
      <div className="min-w-0">
        <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
          ADIPEC Lead Gen
        </span>
        <span className="block truncate text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          ABM Intelligence
        </span>
      </div>
    </div>
  )
}

/** Sidebar + top bar around every signed-in page. */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only z-[70] rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-border/80">
          <Brand />
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface shadow-2xl">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Main navigation menu</Dialog.Description>
            <div className="flex h-16 items-center justify-between border-b border-border pr-2">
              <Brand />
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close menu">
                  <X className="size-4" aria-hidden />
                </Button>
              </Dialog.Close>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
              <Sidebar onNavigate={() => setMenuOpen(false)} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="ambient-canvas min-h-screen lg:pl-64">
        <header className="glass-header sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/70 px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-4" aria-hidden />
            </Button>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-medium text-foreground">
                <span className="size-1.5 rounded-full bg-success" aria-hidden />
                Exhibitor Pipeline
              </span>
              {import.meta.env.VITE_API_MOCK === 'true' && (
                <span className="rounded-full bg-info-soft px-2 py-0.5 font-medium text-info-ink">
                  Mock Mode
                </span>
              )}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="h-5 w-px bg-border" aria-hidden />
            <UserMenu />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
