import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import type { Run, RunStep } from '@/api/types'
import { DateTime } from '@/components/DateTime'
import { EmptyState } from '@/components/EmptyState'
import { NotAvailable } from '@/components/NotAvailable'
import { RUN_STEP_LABEL } from '@/lib/runs'

/** The errors a run recorded (newest first, at most the last 100), each linking to its company. */
export function RunErrors({ errors }: { errors: Run['errors'] }) {
  if (errors.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No errors so far"
        hint="Nothing has gone wrong in this run."
      />
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <caption className="sr-only">Errors recorded by this run</caption>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">
              When
            </th>
            <th scope="col" className="px-2 py-2 font-medium">
              Company
            </th>
            <th scope="col" className="px-2 py-2 font-medium">
              Step
            </th>
            <th scope="col" className="px-2 py-2 font-medium">
              What happened
            </th>
          </tr>
        </thead>
        <tbody>
          {errors.map((error, index) => (
            <tr key={`${error.at}-${index}`} className="border-b border-border last:border-0">
              <td className="py-2 pr-4 align-top whitespace-nowrap">
                <DateTime value={error.at} />
              </td>
              <td className="px-2 py-2 align-top">
                {error.companyId ? (
                  <Link
                    to={`/companies/${error.companyId}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {error.companyName ?? error.companyId}
                  </Link>
                ) : (
                  <NotAvailable />
                )}
              </td>
              <td className="px-2 py-2 align-top whitespace-nowrap">
                {RUN_STEP_LABEL[error.step as RunStep] ?? error.step}
              </td>
              <td className="px-2 py-2 align-top">{error.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
