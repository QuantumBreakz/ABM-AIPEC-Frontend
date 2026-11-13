import type { Company } from '@/api/types'
import { ContactsCard } from '@/components/contacts/ContactsCard'
import { SalesNavCard } from './SalesNavCard'

/**
 * The Sales Navigator account and leadership coverage sit above the list of decision-makers,
 * because coverage describes how complete that list is (it is never claimed complete unless reviewed).
 */
export function ContactsTab({ company }: { company: Company }) {
  return (
    <div className="flex flex-col gap-6">
      <SalesNavCard company={company} />
      <ContactsCard company={company} />
    </div>
  )
}
