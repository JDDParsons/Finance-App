export type TransferInput = {
  fromAccountId?: unknown
  toAccountId?: unknown
  amount?: unknown
  date?: unknown
}

export type ValidTransferInput = {
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
}

function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

export function validateTransferInput(input: TransferInput): ValidTransferInput {
  const fromAccountId = typeof input.fromAccountId === 'string' ? input.fromAccountId.trim() : ''
  const toAccountId = typeof input.toAccountId === 'string' ? input.toAccountId.trim() : ''
  const amount = typeof input.amount === 'number' || typeof input.amount === 'string'
    ? Number(input.amount)
    : Number.NaN
  const date = typeof input.date === 'string' ? input.date.trim() : ''

  if (!fromAccountId || !toAccountId) throw new Error('Select both a source and destination account.')
  if (fromAccountId === toAccountId) throw new Error('Source and destination accounts must be different.')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Transfer amount must be greater than zero.')
  if (!isValidDate(date)) {
    throw new Error('Enter a valid transfer date.')
  }

  return { fromAccountId, toAccountId, amount, date }
}
