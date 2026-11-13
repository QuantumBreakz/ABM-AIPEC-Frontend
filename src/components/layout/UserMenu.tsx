import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { ChevronDown, LogOut, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth, useMe } from '@/auth/auth-context'

export function UserMenu() {
  const { user } = useMe()
  const { signOut } = useAuth()
  const initial = user.email.charAt(0).toUpperCase()

  return (
    <Dropdown.Root>
      <Dropdown.Trigger className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-muted/60 data-[state=open]:border-border data-[state=open]:bg-muted">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-xs"
        >
          {initial}
        </span>
        <div className="hidden text-left sm:block">
          <span className="block max-w-44 truncate text-[0.8125rem] font-medium leading-tight text-foreground">
            {user.email}
          </span>
          <span className="block text-[0.6875rem] capitalize leading-tight text-muted-foreground">
            {user.role}
          </span>
        </div>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="sr-only">Account menu</span>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-60 rounded-xl border border-border bg-surface p-1.5 shadow-xl"
        >
          <div className="rounded-lg bg-muted/60 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{user.email}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden />
              {user.role} account
            </p>
          </div>
          <Dropdown.Separator className="my-1.5 h-px bg-border" />
          <Dropdown.Item
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-muted"
            onSelect={() => {
              void signOut().then(() => toast.success('You have been signed out.'))
            }}
          >
            <LogOut className="size-4 text-muted-foreground" aria-hidden />
            Sign out
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}
