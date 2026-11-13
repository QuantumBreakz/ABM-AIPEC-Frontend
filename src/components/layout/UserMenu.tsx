import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { ChevronDown, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth, useMe } from '@/auth/auth-context'

export function UserMenu() {
  const { user } = useMe()
  const { signOut } = useAuth()
  const initial = user.email.charAt(0).toUpperCase()

  return (
    <Dropdown.Root>
      <Dropdown.Trigger className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted data-[state=open]:bg-muted">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          {initial}
        </span>
        <span className="hidden max-w-44 truncate text-sm font-medium sm:block">{user.email}</span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        <span className="sr-only">Account menu</span>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-56 rounded-md border border-border bg-surface p-1 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{user.email}</p>
            <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
          </div>
          <Dropdown.Separator className="my-1 h-px bg-border" />
          <Dropdown.Item
            className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted"
            onSelect={() => {
              void signOut().then(() => toast.success('You have been signed out.'))
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}
