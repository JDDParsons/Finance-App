import { ReportService } from '../services/report.service'

export default defineEventHandler(async (event) => {
  try {
    const q = getQuery(event) as any
    const year = q.year ? Number(q.year) : 2025
    const month = q.month ? Number(q.month) : 8

    if (!year || !month) throw createError({ statusCode: 400, statusMessage: 'Missing year or month' })

    const service = new ReportService()
    const records = await service.getTransactionsForMonth(year, month)

    return records
  } catch (err: any) {
    throw createError({ statusCode: err.statusCode || 500, statusMessage: err.message || 'Server error' })
  }
})
