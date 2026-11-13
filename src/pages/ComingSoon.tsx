import { Clock } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

/** Product placeholder view for upcoming workspace modules. */
export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="card-elevated border-dashed">
        <EmptyState
          icon={Clock}
          title={`${title} coming soon`}
          hint={description ?? 'This module is scheduled for an upcoming release.'}
          action={
            <Button asChild variant="secondary" size="sm">
              <Link to="/">Back to overview</Link>
            </Button>
          }
        />
      </div>
    </>
  )
}
