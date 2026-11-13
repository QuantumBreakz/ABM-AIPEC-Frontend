import type { Event, Overview } from '@/api/types'
import { db, nextId } from '../db'
import { badRequest, conflict, json, requireString, route } from '../http'
import { buildOverview, resolveEdition } from '../stats'

export const eventHandlers = [
  route.get('/events', 'user', () => json<Event[]>(db.events)),

  route.post('/events', 'admin', async ({ body }) => {
    const input = await body<{
      edition?: unknown
      name?: unknown
      directoryUrl?: unknown
      advertisedCount?: unknown
    }>()
    const edition = Number(input.edition)
    if (!Number.isInteger(edition) || edition < 2000)
      throw badRequest('"edition" must be a year, for example 2027.')
    if (db.events.some((e) => e.edition === edition))
      throw conflict(`Edition ${edition} already exists.`)
    const event: Event = {
      id: nextId('e'),
      edition,
      name: requireString(input.name, 'name'),
      directoryUrl: requireString(input.directoryUrl, 'directoryUrl'),
      advertisedCount:
        typeof input.advertisedCount === 'number' ? input.advertisedCount : undefined,
    }
    db.events.push(event)
    return json<Event>(event, 201)
  }),

  route.get('/stats/overview', 'user', ({ url }) =>
    json<Overview>(buildOverview(resolveEdition(url.searchParams.get('edition')))),
  ),
]
