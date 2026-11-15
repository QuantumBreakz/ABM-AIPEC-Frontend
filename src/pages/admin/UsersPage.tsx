import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Plus, Trash2, Users } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from '@/api/queries/admin'
import type { Role, User } from '@/api/types'
import { useMe } from '@/auth/auth-context'
import { ChartCard } from '@/components/charts/ChartCard'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DateTime } from '@/components/DateTime'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { FormDialog } from '@/components/FormDialog'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { EMAIL_RE } from '@/lib/contacts'

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', reviewer: 'Reviewer' }
const ROLE_HELP = 'Admins manage people, runs and email checks. Reviewers work the queues.'

const passwordRule = z.string().min(8, 'Use at least 8 characters.')

const createSchema = z.object({
  email: z
    .string()
    .trim()
    .refine((v) => EMAIL_RE.test(v), 'Enter a valid email address.'),
  password: passwordRule,
  role: z.enum(['admin', 'reviewer']),
})
const resetSchema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'The two passwords do not match.',
  })

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-[13px] text-danger-ink">
      {message}
    </p>
  )
}

function AddUserForm({ onClose }: { onClose: () => void }) {
  const id = useId()
  const create = useCreateUser()
  const [serverError, setServerError] = useState<string>()
  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: '', password: '', role: 'reviewer' },
  })
  const { errors } = form.formState

  const submit = form.handleSubmit(async (values) => {
    setServerError(undefined)
    try {
      await create.mutateAsync(values)
      toast.success(`${values.email} was added.`)
      onClose()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'The user could not be added.')
    }
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
          {serverError}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-email`} className="text-[0.8125rem] font-medium">
          Email
        </label>
        <Input
          id={`${id}-email`}
          type="email"
          autoComplete="off"
          aria-invalid={errors.email ? true : undefined}
          {...form.register('email')}
        />
        <FieldError id={`${id}-email-error`} message={errors.email?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-password`} className="text-[0.8125rem] font-medium">
          Password
        </label>
        <Input
          id={`${id}-password`}
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          {...form.register('password')}
        />
        <FieldError id={`${id}-password-error`} message={errors.password?.message} />
        {!errors.password && (
          <p className="text-[0.8125rem] text-muted-foreground">
            At least 8 characters. Share it with the person safely; they can ask you to change it.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-role`} className="text-[0.8125rem] font-medium">
          Role
        </label>
        <Select id={`${id}-role`} {...form.register('role')}>
          <option value="reviewer">Reviewer</option>
          <option value="admin">Admin</option>
        </Select>
        <p className="text-[0.8125rem] text-muted-foreground">{ROLE_HELP}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          Add user
        </Button>
      </div>
    </form>
  )
}

function ResetPasswordForm({ user, onClose }: { user: User; onClose: () => void }) {
  const id = useId()
  const update = useUpdateUser()
  const [serverError, setServerError] = useState<string>()
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirm: '' },
  })
  const { errors } = form.formState

  const submit = form.handleSubmit(async ({ password }) => {
    setServerError(undefined)
    try {
      await update.mutateAsync({ id: user.id, password })
      toast.success(`The password for ${user.email} was changed.`)
      onClose()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'The password could not be changed.')
    }
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {serverError && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
          {serverError}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-new`} className="text-[0.8125rem] font-medium">
          New password
        </label>
        <Input
          id={`${id}-new`}
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          {...form.register('password')}
        />
        <FieldError id={`${id}-new-error`} message={errors.password?.message} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-confirm`} className="text-[0.8125rem] font-medium">
          Type it again
        </label>
        <Input
          id={`${id}-confirm`}
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirm ? true : undefined}
          {...form.register('confirm')}
        />
        <FieldError id={`${id}-confirm-error`} message={errors.confirm?.message} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          Change password
        </Button>
      </div>
    </form>
  )
}

export default function UsersPage() {
  const { user: me } = useMe()
  const users = useUsers()
  const update = useUpdateUser()
  const remove = useDeleteUser()
  const [adding, setAdding] = useState(false)
  const [resetting, setResetting] = useState<User>()
  const [deleting, setDeleting] = useState<User>()

  const changeRole = async (user: User, role: Role) => {
    try {
      await update.mutateAsync({ id: user.id, role })
      toast.success(`${user.email} is now ${ROLE_LABEL[role].toLowerCase()}.`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'The role could not be changed.')
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success(`${deleting.email} was deleted.`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'The user could not be deleted.')
    } finally {
      setDeleting(undefined)
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who can sign in to this workspace."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            Add user
          </Button>
        }
      />

      <ChartCard title={`People (${users.data?.length ?? 0})`} subtitle={ROLE_HELP}>
        {users.isPending ? (
          <div role="status" aria-busy="true" className="flex flex-col gap-2">
            <span className="sr-only">Loading…</span>
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : users.error ? (
          <ErrorState error={users.error} onRetry={() => void users.refetch()} />
        ) : users.data.length === 0 ? (
          <EmptyState icon={Users} title="No users" hint="Add the first person." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.8125rem]">
              <caption className="sr-only">Users</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Added
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.data.map((user) => {
                  const self = user.id === me.id
                  return (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <th scope="row" className="py-3 pr-4 text-left align-middle font-normal">
                        <span className="text-sm font-medium">{user.email}</span>
                        {self && (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            You
                          </span>
                        )}
                      </th>
                      <td className="px-3 py-3 align-middle">
                        <Select
                          aria-label={`Role of ${user.email}`}
                          className="w-36"
                          value={user.role}
                          disabled={self || update.isPending}
                          title={self ? 'You cannot change your own role.' : undefined}
                          onChange={(e) => void changeRole(user, e.target.value as Role)}
                        >
                          <option value="admin">Admin</option>
                          <option value="reviewer">Reviewer</option>
                        </Select>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <DateTime value={user.createdAt} />
                      </td>
                      <td className="py-3 pl-3 align-middle">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Reset password for ${user.email}`}
                            onClick={() => setResetting(user)}
                          >
                            <KeyRound className="size-4" aria-hidden />
                            Reset password
                          </Button>
                          {!self && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${user.email}`}
                              onClick={() => setDeleting(user)}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <FormDialog
        open={adding}
        onOpenChange={setAdding}
        title="Add a user"
        description="They sign in with this email and password."
      >
        <AddUserForm onClose={() => setAdding(false)} />
      </FormDialog>
      <FormDialog
        open={!!resetting}
        onOpenChange={(open) => !open && setResetting(undefined)}
        title="Reset password"
        description={resetting ? `Set a new password for ${resetting.email}.` : undefined}
      >
        {resetting && (
          <ResetPasswordForm user={resetting} onClose={() => setResetting(undefined)} />
        )}
      </FormDialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={deleting ? `Delete ${deleting.email}?` : 'Delete user?'}
        description="They can no longer sign in. Work they did stays in the history."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
