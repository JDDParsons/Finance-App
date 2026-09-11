import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { OfflineFinanceSnapshot } from '~/types/bootstrap'

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
    value: import('~/types/offline').OfflineCreateOperation
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

export async function putOfflineCreate(operation: import('~/types/offline').OfflineCreateOperation) {
  const database = await getDatabase()
  await database.put('outbox', operation)
}

export async function getOfflineCreates(userId: string) {
  const database = await getDatabase()
  const operations = await database.getAllFromIndex('outbox', 'by-user', userId)
  return operations.sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

export async function deleteOfflineCreate(id: string) {
  const database = await getDatabase()
  await database.delete('outbox', id)
}

export async function reconcileOfflineCreateSnapshots(userId: string, operationId: string, row?: any) {
  const database = await getDatabase()
  const keys = (await database.getAllKeys('snapshots')).filter(key => key.startsWith(`${userId}:`))
  const transaction = database.transaction('snapshots', 'readwrite')

  for (const key of keys) {
    const snapshot = await transaction.store.get(key)
    if (!snapshot) continue
    snapshot.finance.budgetHits = snapshot.finance.budgetHits.filter(item => item.id !== operationId)
    snapshot.finance.income = snapshot.finance.income.filter(item => item.id !== operationId)
    snapshot.finance.transfers = snapshot.finance.transfers.filter(item => item.id !== operationId)

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

export async function markOfflineCreateFailedInSnapshots(
  userId: string,
  operationId: string,
  message: string
) {
  const database = await getDatabase()
  const keys = (await database.getAllKeys('snapshots')).filter(key => key.startsWith(`${userId}:`))
  const transaction = database.transaction('snapshots', 'readwrite')
  for (const key of keys) {
    const snapshot = await transaction.store.get(key)
    if (!snapshot) continue
    const mark = (item: any) => item.id === operationId
      ? { ...item, pending_sync: false, sync_error: message }
      : item
    snapshot.finance.budgetHits = snapshot.finance.budgetHits.map(mark)
    snapshot.finance.income = snapshot.finance.income.map(mark)
    snapshot.finance.transfers = snapshot.finance.transfers.map(mark)
    await transaction.store.put(snapshot, key)
  }
  await transaction.done
}
