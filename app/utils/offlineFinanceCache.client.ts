import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { OfflineFinanceSnapshot } from '~/types/bootstrap'
import type { OfflineOperation, OfflineQueueChange } from '~/types/offline'
import { normalizeOperation, sortForReplay } from '../../utils/offlineQueue'

const DATABASE_NAME = 'budgify-offline'
const DATABASE_VERSION = 2
let databasePromise: Promise<IDBPDatabase<OfflineFinanceDatabase>> | null = null

interface OfflineFinanceDatabase extends DBSchema {
  snapshots: {
    key: string
    value: OfflineFinanceSnapshot
  }
  preferences: {
    key: string
    value: string
  }
  outbox: {
    key: string
    value: OfflineOperation
    indexes: { 'by-user': string }
  }
}

function snapshotKey(userId: string, year: number, month: number) {
  return `${userId}:${year}-${String(month).padStart(2, '0')}`
}

async function getDatabase() {
  databasePromise ??= openDB<OfflineFinanceDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('snapshots')) database.createObjectStore('snapshots')
      if (!database.objectStoreNames.contains('preferences')) database.createObjectStore('preferences')
      if (!database.objectStoreNames.contains('outbox')) {
        const outbox = database.createObjectStore('outbox', { keyPath: 'id' })
        outbox.createIndex('by-user', 'userId')
      }
    },
  })
  return databasePromise
}

export async function getOfflineFinanceSnapshot(
  userId: string,
  fallbackMonth: { year: number; month: number }
) {
  const database = await getDatabase()
  const preferredKey = await database.get('preferences', userId)
  const key = preferredKey ?? snapshotKey(userId, fallbackMonth.year, fallbackMonth.month)
  const snapshot = await database.get('snapshots', key)

  if (!snapshot || snapshot.userId !== userId || snapshot.cacheVersion !== 1) return null
  return snapshot
}

export async function getOfflineFinanceSnapshotForMonth(
  userId: string,
  year: number,
  month: number
) {
  const database = await getDatabase()
  const snapshot = await database.get('snapshots', snapshotKey(userId, year, month))
  if (!snapshot || snapshot.userId !== userId || snapshot.cacheVersion !== 1) return null
  return snapshot
}

export async function saveOfflineFinanceSnapshot(snapshot: OfflineFinanceSnapshot) {
  const database = await getDatabase()
  const { year, month } = snapshot.finance.selectedMonth
  const key = snapshotKey(snapshot.userId, year, month)
  const transaction = database.transaction(['snapshots', 'preferences'], 'readwrite')
  await Promise.all([
    transaction.objectStore('snapshots').put(snapshot, key),
    transaction.objectStore('preferences').put(key, snapshot.userId),
    transaction.done,
  ])
}

export async function clearOfflineFinanceCache() {
  const database = await getDatabase()
  const transaction = database.transaction(['snapshots', 'preferences', 'outbox'], 'readwrite')
  await Promise.all([
    transaction.objectStore('snapshots').clear(),
    transaction.objectStore('preferences').clear(),
    transaction.objectStore('outbox').clear(),
    transaction.done,
  ])

  if ('caches' in globalThis) await caches.delete('nuxt-api')
}

export async function putOfflineOperation(operation: OfflineOperation) {
  const database = await getDatabase()
  await database.put('outbox', operation)
}

/** Entries saved before Phase 2 (creates with `kind`) are read as create operations. */
export async function getOfflineOperations(userId: string) {
  const database = await getDatabase()
  const operations = await database.getAllFromIndex('outbox', 'by-user', userId)
  return sortForReplay(operations.map(normalizeOperation))
}

export async function deleteOfflineOperation(id: string) {
  const database = await getDatabase()
  await database.delete('outbox', id)
}

/** Apply a merge or queue change in one transaction so the outbox never holds half of it. */
export async function applyOfflineQueueChange(change: OfflineQueueChange) {
  const database = await getDatabase()
  const transaction = database.transaction('outbox', 'readwrite')
  await Promise.all([
    ...change.remove.map(id => transaction.store.delete(id)),
    ...change.put.map(operation => transaction.store.put(operation)),
    transaction.done,
  ])
}

/**
 * Store a snapshot for a month without making it the one opened on launch.
 * Used when pre-caching months in the background.
 */
export async function saveOfflineMonthSnapshot(snapshot: OfflineFinanceSnapshot) {
  const database = await getDatabase()
  const { year, month } = snapshot.finance.selectedMonth
  await database.put('snapshots', snapshot, snapshotKey(snapshot.userId, year, month))
}

/** Replace (or, with no row, remove) the row with this id in every cached month. */
export async function reconcileOfflineSnapshots(userId: string, rowId: string, row?: any) {
  const database = await getDatabase()
  const keys = (await database.getAllKeys('snapshots')).filter(key => key.startsWith(`${userId}:`))
  const transaction = database.transaction('snapshots', 'readwrite')

  for (const key of keys) {
    const snapshot = await transaction.store.get(key)
    if (!snapshot) continue
    snapshot.finance.budgetHits = snapshot.finance.budgetHits.filter(item => item.id !== rowId)
    snapshot.finance.income = snapshot.finance.income.filter(item => item.id !== rowId)
    snapshot.finance.transfers = snapshot.finance.transfers.filter(item => item.id !== rowId)

    const monthKey = `${snapshot.finance.selectedMonth.year}-${String(snapshot.finance.selectedMonth.month).padStart(2, '0')}`
    if (row && String(row.date).slice(0, 7) === monthKey) {
      if (row.type === 'Expense') snapshot.finance.budgetHits.unshift(row)
      if (row.type === 'Income') snapshot.finance.income.unshift(row)
      if (row.type === 'Transfer') snapshot.finance.transfers.unshift(row)
    }
    await transaction.store.put(snapshot, key)
  }
  await transaction.done
}

export async function markOfflineFailedInSnapshots(
  userId: string,
  rowId: string,
  message: string
) {
  const database = await getDatabase()
  const keys = (await database.getAllKeys('snapshots')).filter(key => key.startsWith(`${userId}:`))
  const transaction = database.transaction('snapshots', 'readwrite')
  for (const key of keys) {
    const snapshot = await transaction.store.get(key)
    if (!snapshot) continue
    const mark = (item: any) => item.id === rowId
      ? { ...item, pending_sync: false, sync_error: message }
      : item
    snapshot.finance.budgetHits = snapshot.finance.budgetHits.map(mark)
    snapshot.finance.income = snapshot.finance.income.map(mark)
    snapshot.finance.transfers = snapshot.finance.transfers.map(mark)
    await transaction.store.put(snapshot, key)
  }
  await transaction.done
}
