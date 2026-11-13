import { Users } from 'lucide-react'
import type { Company } from '@/api/types'
import { EmptyState } from '@/components/EmptyState'
import { SalesNavCard } from './SalesNavCard'

/** Account & Sales Navigator details plus the upcoming contact directory placeholder. */
export function ContactsTab({ company }: { company: Company }) {
  return (
    <div className="flex flex-col gap-6">
      <SalesNavCard company={company} />
      <div className="card-elevated border-dashed">
        <EmptyState
          icon={Users}
          title="Contact directory coming soon"
          hint="Decision-makers and verification status will appear here."
        />
      </div>
    </div>
  )
}
