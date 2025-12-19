import { prisma } from '../api/prisma'

export class ReportService {
  // Returns all transactions for a given year and month (month is 1-12)
  async getTransactionsForMonth(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1))
    const nextMonth = new Date(Date.UTC(year, month, 1))

    const results = await prisma.transaction.findMany({
      where: {
        transaction_date: {
          gte: start,
          lt: nextMonth,
        },
      },
      orderBy: { transaction_date: 'asc' },
    })

    return results
  }
}
