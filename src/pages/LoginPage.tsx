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

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

const signupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Enter your email address.')
      .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address.'),
    username: z
      .string()
      .trim()
      .refine((v) => v === '' || v.length >= 2, 'Username must be at least 2 characters.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match.',
  })

type LoginValues = z.infer<typeof loginSchema>
type SignupValues = z.infer<typeof signupSchema>

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
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [serverError, setServerError] = useState<string>()
  const [showPassword, setShowPassword] = useState(false)

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', username: '', password: '', confirmPassword: '' },
  })

  const next = safeNext(params.get('next'))
  if (user) return <Navigate to={next} replace />

  const onLogin = async (values: LoginValues) => {
    setServerError(undefined)
    try {
      const signedIn = await api.post<User>('/auth/login', values)
      setUser(signedIn)
      navigate(next, { replace: true })
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      )
    }
  }

  const onSignup = async (values: SignupValues) => {
    setServerError(undefined)
    try {
      const created = await api.post<User>('/auth/signup', {
        email: values.email,
        username: values.username || undefined,
        password: values.password,
      })
      setUser(created)
      navigate(next, { replace: true })
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      )
    }
  }

  const fillDemo = (email: string) => {
    setMode('login')
    loginForm.setValue('email', email, { shouldValidate: true })
    loginForm.setValue('password', 'password', { shouldValidate: true })
  }

  const switchMode = (nextMode: 'login' | 'signup') => {
    setServerError(undefined)
    setMode(nextMode)
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Apple Pro Space Black editorial showcase panel */}
      <aside className="bg-grid-architectural relative hidden flex-col justify-between overflow-hidden bg-[#0c0c0e] p-10 text-[#f5f5f7] lg:flex xl:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-[#0066cc]/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-[#3898ff]/18 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <BrandMark className="from-[#5eb0ff] to-[#0066cc] text-white" />
          <div>
            <span className="block text-sm font-semibold tracking-tight text-white">
              ADIPEC Lead Gen
            </span>
            <span className="block text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-[#aeaeb2]">
              ABM Intelligence Platform
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-[#60adff] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <span className="size-1.5 rounded-full bg-[#60adff]" aria-hidden />
            Energy ABM Workspace
          </p>
          <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.03em] text-white xl:text-4xl">
            Exhibitor lists to executive outreach.
          </h2>

          <div className="mt-8 flex flex-col gap-2.5 rounded-2xl border border-white/12 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
            {PIPELINE_STEPS.map(({ num, label, tag, icon: Icon }) => (
              <div
                key={num}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-medium text-[#60adff]">{num}</span>
                  <Icon className="size-4 shrink-0 text-[#60adff]" aria-hidden />
                  <span className="text-sm font-medium text-white">{label}</span>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[0.6875rem] font-medium text-[#e5e5ea]">
                  {tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-[#8e8e93]">ADIPEC Pipeline · Role-based access</p>
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
              <p className="mt-0.5 text-sm text-muted-foreground">
                {mode === 'login' ? 'Sign in' : 'Create a user account'}
              </p>
            </div>
          </div>

          <div
            className="skeuo-track mb-4 grid grid-cols-2 p-1"
            role="tablist"
            aria-label="Account mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className={
                mode === 'login'
                  ? 'skeuo-thumb cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold text-foreground transition-all'
                  : 'cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground'
              }
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => switchMode('signup')}
              className={
                mode === 'signup'
                  ? 'skeuo-thumb cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold text-foreground transition-all'
                  : 'cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground'
              }
            >
              Create account
            </button>
          </div>

          {mode === 'login' ? (
            <form
              onSubmit={loginForm.handleSubmit(onLogin)}
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

              <Field id="email" label="Email" error={loginForm.formState.errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="you@company.com"
                  aria-invalid={!!loginForm.formState.errors.email}
                  aria-describedby={loginForm.formState.errors.email ? 'email-error' : undefined}
                  {...loginForm.register('email')}
                />
              </Field>

              <Field
                id="password"
                label="Password"
                error={loginForm.formState.errors.password?.message}
              >
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="pr-10"
                    aria-invalid={!!loginForm.formState.errors.password}
                    aria-describedby={
                      loginForm.formState.errors.password ? 'password-error' : undefined
                    }
                    {...loginForm.register('password')}
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

              <Button
                type="submit"
                loading={loginForm.formState.isSubmitting}
                className="mt-1 w-full"
              >
                Sign in
              </Button>
            </form>
          ) : (
            <form
              onSubmit={signupForm.handleSubmit(onSignup)}
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

              <Field
                id="signup-email"
                label="Email"
                error={signupForm.formState.errors.email?.message}
              >
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@company.com"
                  aria-invalid={!!signupForm.formState.errors.email}
                  {...signupForm.register('email')}
                />
              </Field>

              <Field
                id="signup-username"
                label="Username (optional)"
                error={signupForm.formState.errors.username?.message}
              >
                <Input
                  id="signup-username"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. sarah.m"
                  aria-invalid={!!signupForm.formState.errors.username}
                  {...signupForm.register('username')}
                />
              </Field>

              <Field
                id="signup-password"
                label="Password"
                error={signupForm.formState.errors.password?.message}
              >
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  aria-invalid={!!signupForm.formState.errors.password}
                  {...signupForm.register('password')}
                />
              </Field>

              <Field
                id="signup-confirm"
                label="Confirm password"
                error={signupForm.formState.errors.confirmPassword?.message}
              >
                <Input
                  id="signup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-invalid={!!signupForm.formState.errors.confirmPassword}
                  {...signupForm.register('confirmPassword')}
                />
              </Field>

              <Button
                type="submit"
                loading={signupForm.formState.isSubmitting}
                className="mt-1 w-full"
              >
                Create account
              </Button>
            </form>
          )}

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
