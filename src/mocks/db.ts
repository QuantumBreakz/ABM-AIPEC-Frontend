import type {
  Company,
  Contact,
  Event,
  ExportLogEntry,
  HistoryEntry,
  Providers,
  Run,
  Suppression,
  User,
} from '@/api/types'
import { buildSeed } from './seed'

export type MockUser = User & { password: string }

/** A queued AI regeneration. It finishes lazily the next time the item is read. */
export type PendingAi = { kind: 'company' | 'contact'; id: string; readyAt: number }

export type MockDb = {
  users: MockUser[]
  events: Event[]
  companies: Company[]
  history: Record<string, HistoryEntry[]>
  runs: Run[]
  exportLog: ExportLogEntry[]
  suppressions: Suppression[]
  providers: Providers
  pendingAi: PendingAi[]
  /** Companies a reviewer said are NOT duplicates. */
  notDuplicate: string[]
  seq: number
}

function fresh(): MockDb {
  return { ...buildSeed(), pendingAi: [], notDuplicate: [], seq: 1000 }
}

/** The in-memory fake database. A page refresh resets it. */
export const db: MockDb = fresh()

export function resetDb() {
  Object.assign(db, fresh())
}

export function nextId(prefix: string) {
  db.seq += 1
  return `${prefix}_${db.seq}`
}

export function findCompany(id: string) {
  return db.companies.find((c) => c.id === id)
}

export function findContact(id: string): { company: Company; contact: Contact } | undefined {
  for (const company of db.companies) {
    const contact = company.contacts.find((c) => c.id === id)
    if (contact) return { company, contact }
  }
  return undefined
}

export function addHistory(
  companyId: string,
  field: string,
  before: unknown,
  after: unknown,
  by: string,
) {
  const list = db.history[companyId] ?? []
  list.unshift({ field, before, after, by, at: new Date().toISOString() })
  db.history[companyId] = list
}
