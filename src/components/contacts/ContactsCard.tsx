import { Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { useDeleteContact } from '@/api/queries/contacts'
import type { Company, Contact } from '@/api/types'
import { useMe } from '@/auth/auth-context'
import { ChartCard } from '@/components/charts/ChartCard'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DateTime } from '@/components/DateTime'
import { EmptyState } from '@/components/EmptyState'
import { NotAvailable } from '@/components/NotAvailable'
import { SourceLink } from '@/components/SourceLink'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { fullName, sourceLabel, verificationNote } from '@/lib/contacts'
import { shortUrl } from '@/lib/format'
import { ContactForm } from './ContactForm'

function EmailLines({ contact }: { contact: Contact }) {
  if (contact.emails.length === 0) {
    return <span className="text-muted-foreground">No emails saved</span>
  }
  return (
    <ul aria-label={`Emails of ${fullName(contact)}`} className="flex flex-col gap-2.5">
      {contact.emails.map((email) => {
        const source = sourceLabel(email.provider)
        return (
          <li key={email.address}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-all font-mono text-[0.8125rem]">{email.address}</span>
              <StatusBadge
                kind="email"
                status={email.verification.status}
                reason={verificationNote(email)}
              />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {email.type === 'generic' ? 'Company inbox' : 'Personal email'} ·{' '}
              {source ? (
                <>Source: {source}</>
              ) : (
                <span className="font-medium text-warning-ink">No source recorded</span>
              )}{' '}
              · Added <DateTime value={email.capturedAt} />
            </p>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Every decision-maker saved for the company, with their emails, where each email came from and
 * whether it has been checked. A company is still valid with no contacts at all.
 */
export function ContactsCard({ company }: { company: Company }) {
  const { isAdmin } = useMe()
  const remove = useDeleteContact(company.id)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | undefined>()
  const [deleting, setDeleting] = useState<Contact | undefined>()

  const openAdd = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (contact: Contact) => {
    setEditing(contact)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success(`${fullName(deleting)} was deleted.`)
      setDeleting(undefined)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'The contact could not be deleted.')
      setDeleting(undefined)
    }
  }

  const { contacts } = company

  return (
    <ChartCard
      title={`Decision-makers (${contacts.length})`}
      subtitle="The people you found for this company. Each email shows where it came from and whether it has been checked."
      action={
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" aria-hidden />
          Add contact
        </Button>
      }
    >
      {contacts.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No decision-makers saved yet"
          hint={
            company.stages.people.reason ??
            'A company is still valid without contacts. Add the people you find, or leave it empty if none could be found.'
          }
          action={
            <Button variant="secondary" onClick={openAdd}>
              <Plus className="size-4" aria-hidden />
              Add contact
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[0.8125rem]">
            <caption className="sr-only">Decision-makers saved for this company</caption>
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Person
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Emails
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Profile
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Found via
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-border last:border-0">
                  <th scope="row" className="py-3 pr-4 text-left align-top font-normal">
                    <p className="text-sm font-semibold text-foreground">{fullName(contact)}</p>
                    <p className="text-muted-foreground">
                      {contact.title ?? <NotAvailable label="No title recorded" />}
                    </p>
                    {contact.seniority && (
                      <span className="mt-1 inline-block rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs text-foreground">
                        {contact.seniority}
                      </span>
                    )}
                    {contact.geography && (
                      <p className="mt-1 text-xs text-muted-foreground">{contact.geography}</p>
                    )}
                  </th>
                  <td className="px-3 py-3 align-top">
                    <EmailLines contact={contact} />
                  </td>
                  <td className="px-3 py-3 align-top">
                    {contact.profileUrl ? (
                      <SourceLink href={contact.profileUrl} label={shortUrl(contact.profileUrl)} />
                    ) : (
                      <NotAvailable />
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p>{sourceLabel(contact.source)}</p>
                    {contact.matchConfidence && (
                      <p className="text-xs text-muted-foreground">
                        {contact.matchConfidence.charAt(0).toUpperCase() +
                          contact.matchConfidence.slice(1)}{' '}
                        confidence
                      </p>
                    )}
                  </td>
                  <td className="py-3 pl-3 align-top">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${fullName(contact)}`}
                        onClick={() => openEdit(contact)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${fullName(contact)}`}
                          onClick={() => setDeleting(contact)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        companyId={company.id}
        contacts={contacts}
        editing={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={deleting ? `Delete ${fullName(deleting)}?` : 'Delete contact?'}
        description="Their emails and drafts are deleted too. This cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </ChartCard>
  )
}
