import * as Dialog from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router'
import { Button } from '../ui/button'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5">
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
      >
        A
      </span>
      <span className="font-semibold tracking-tight">ADIPEC Lead Gen</span>
    </div>
  )
}

/** Sidebar + top bar around every signed-in page. */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only z-[70] rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center border-b border-border">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile sidebar: only has to not break, so it is a simple slide-in panel */}
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface shadow-xl">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Main navigation menu</Dialog.Description>
            <div className="flex h-14 items-center justify-between border-b border-border pr-2">
              <Brand />
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close menu">
                  <X className="size-4" aria-hidden />
                </Button>
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar onNavigate={() => setMenuOpen(false)} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-surface/90 px-4 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-4" aria-hidden />
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto max-w-[1400px] p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
