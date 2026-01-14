import { TransactionService } from '../services/transaction.service'

export default defineEventHandler(async () => {
  const svc = new TransactionService()
  const rows = await svc.getAllSorted()
  return rows
})
