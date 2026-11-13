import { aiHandlers } from './ai'
import { authHandlers } from './auth'
import { companyHandlers } from './companies'
import { contactHandlers } from './contacts'
import { eventHandlers } from './events'
import { exportHandlers } from './exports'
import { reviewHandlers } from './review'
import { runHandlers } from './runs'
import { systemHandlers } from './system'
import { userHandlers } from './users'

/** One handler per endpoint of the API contract in PLAN.md. */
export const handlers = [
  ...authHandlers,
  ...userHandlers,
  ...eventHandlers,
  ...runHandlers,
  ...companyHandlers,
  ...contactHandlers,
  ...reviewHandlers,
  ...aiHandlers,
  ...exportHandlers,
  ...systemHandlers,
]
