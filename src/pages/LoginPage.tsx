import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { ApiError, api } from '@/api/client'
import type { User } from '@/api/types'
import { useAuth } from '@/auth/auth-context'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { safeNext } from '@/lib/nav'

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})
type Values = z.infer<typeof schema>

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.8125rem] font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[0.8125rem] text-danger-ink">
          {error}
        </p>
      )}
    </div>
  )
}

const PIPELINE_STEPS = [
  { num: '01', label: 'Exhibitor discovery', tag: 'Auto', icon: CheckCircle2 },
  { num: '02', label: 'Website & contact proof', tag: 'Sourced', icon: ShieldCheck },
  { num: '03', label: 'Outreach drafting', tag: 'QA ready', icon: Sparkles },
]

export default function LoginPage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [serverError, setServerError] = useState<string>()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const next = safeNext(params.get('next'))
  if (user) return <Navigate to={next} replace />

  const onSubmit = async (values: Values) => {
    setServerError(undefined)
    try {
      const signedIn = await api.post<User>('/auth/login', values)
      setUser(signedIn)
      navigate(next, { replace: true })
    } catch (error) {
      // 401 "wrong password" and 429 "too many attempts" carry a ready-made message.
      setServerError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      )
    }
  }

  const fillDemo = (email: string) => {
    setValue('email', email, { shouldValidate: true })
    setValue('password', 'password', { shouldValidate: true })
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Architectural editorial showcase panel */}
      <aside className="bg-grid-architectural relative hidden flex-col justify-between overflow-hidden bg-[#0b1622] p-10 text-[#e7edf5] lg:flex xl:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-[#0b5b67]/35 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-[#2dd4bf]/15 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <BrandMark className="bg-[#2dd4bf] text-[#090e17]" />
          <div>
            <span className="block text-sm font-semibold tracking-tight text-white">
              ADIPEC Lead Gen
            </span>
            <span className="block text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-[#9fb0c7]">
              ABM Intelligence Platform
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-[#5eead4]">
            <span className="size-1.5 rounded-full bg-[#5eead4]" aria-hidden />
            Energy ABM Workspace
          </p>
          <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.03em] text-white xl:text-4xl">
            Exhibitor lists to executive outreach.
          </h2>

          <div className="mt-8 flex flex-col gap-2.5 rounded-2xl border border-white/12 bg-white/[0.04] p-4 backdrop-blur-xs">
            {PIPELINE_STEPS.map(({ num, label, tag, icon: Icon }) => (
              <div
                key={num}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-medium text-[#5eead4]">{num}</span>
                  <Icon className="size-4 shrink-0 text-[#5eead4]" aria-hidden />
                  <span className="text-sm font-medium text-white">{label}</span>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.6875rem] font-medium text-[#cbd5e1]">
                  {tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-[#7f91aa]">ADIPEC Pipeline · Role-based access</p>
      </aside>

      {/* Sign-in surface */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[24rem]">
          <div className="mb-6 flex items-center gap-3">
            <BrandMark className="size-10 lg:hidden" />
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground">
                ADIPEC Lead Gen
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Sign in</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="card-elevated flex flex-col gap-4 p-6 sm:p-7"
          >
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{serverError}</span>
              </div>
            )}

            <Field id="email" label="Email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="you@company.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
              />
            </Field>

            <Field id="password" label="Password" error={errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-10"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            </Field>

            <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
              Sign in
            </Button>
          </form>

          {import.meta.env.VITE_API_MOCK === 'true' && (
            <div className="mt-4 flex flex-col items-center gap-2.5 rounded-xl border border-border bg-surface/70 px-4 py-3 text-xs text-muted-foreground">
              <p>
                Mock mode · password <strong className="text-foreground">password</strong>
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fillDemo('admin@example.com')}
                >
                  Use admin
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fillDemo('reviewer@example.com')}
                >
                  Use reviewer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
