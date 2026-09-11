import { openDB, type DBSchema } from 'idb'
import type { OfflineFinanceSnapshot } from '~/types/bootstrap'

const DATABASE_NAME = 'budgify-offline'
const DATABASE_VERSION = 1

interface OfflineFinanceDatabase extends DBSchema {
  snapshots: {
    key: string
    value: OfflineFinanceSnapshot
  }
  preferences: {
    key: string
    value: string
  }
}

function snapshotKey(userId: string, year: number, month: number) {
  return `${userId}:${year}-${String(month).padStart(2, '0')}`
}

async function getDatabase() {
  return openDB<OfflineFinanceDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('snapshots')) database.createObjectStore('snapshots')
      if (!database.objectStoreNames.contains('preferences')) database.createObjectStore('preferences')
    },
  })
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
  const transaction = database.transaction(['snapshots', 'preferences'], 'readwrite')
  await Promise.all([
    transaction.objectStore('snapshots').clear(),
    transaction.objectStore('preferences').clear(),
    transaction.done,
  ])

  if ('caches' in globalThis) await caches.delete('nuxt-api')
}
