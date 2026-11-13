import { Hammer } from 'lucide-react'
import type { Company } from '@/api/types'
import { EmptyState } from '@/components/EmptyState'
import { SalesNavCard } from './SalesNavCard'

/** The account and leadership details are here now; the contact list itself arrives with FE-3.1. */
export function ContactsTab({ company }: { company: Company }) {
  return (
    <div className="flex flex-col gap-6">
      <SalesNavCard company={company} />
      <div className="rounded-lg border border-dashed border-border bg-surface">
        <EmptyState
          icon={Hammer}
          title="The contact list is being built"
          hint="It arrives with ticket FE-3.1."
        />
      </div>
    </div>
  )
}
