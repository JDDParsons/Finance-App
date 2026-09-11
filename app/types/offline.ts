export type OfflineCreateKind = 'expense' | 'income' | 'transfer'

export interface OfflineCreateOperation {
  id: string
  userId: string
  kind: OfflineCreateKind
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  status: 'pending' | 'failed'
  error: string | null
}

export interface OfflineReplayResult {
  operation: OfflineCreateOperation
  row?: any
  error?: string
}
