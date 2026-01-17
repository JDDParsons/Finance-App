import { TransactionService } from '../services/transaction.service'

export default defineEventHandler(async (event) => {
  const svc = new TransactionService()

  const query = getQuery(event)
  const year = query.year ? Number(query.year) : null
  const month = query.month ? Number(query.month) : null

  // If both year and month are provided, filter by month
  if (year && month) {
    return await svc.getAllByMonth(year, month)
  }

  // Otherwise return everything
  return await svc.getAllSorted()
})

