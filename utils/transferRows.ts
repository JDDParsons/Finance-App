type TransferRow = {
  id: string
  date?: string | null
  created_at?: string | null
  [key: string]: unknown
}

export function sortTransferRows<T extends TransferRow>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const dateOrder = String(b.date ?? '').localeCompare(String(a.date ?? ''))
    return dateOrder || String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
  })
}

export function reconcileTransferUpdate<T extends TransferRow>(
  rows: T[],
  updated: T,
  selectedMonth: { year: number; month: number }
) {
  const [year, month] = String(updated.date ?? '').slice(0, 10).split('-').map(Number)
  const belongsToSelectedMonth = year === selectedMonth.year && month === selectedMonth.month
  const withoutUpdated = rows.filter(row => row.id !== updated.id)
  return sortTransferRows(withoutUpdated.concat(belongsToSelectedMonth ? [updated] : []))
}

export function removeTransferRow<T extends TransferRow>(rows: T[], id: string) {
  return rows.filter(row => row.id !== id)
}
