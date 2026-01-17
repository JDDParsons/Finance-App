// Service layer for transactions. 
import { prisma } from '../api/prisma'

export class TransactionService {
	// Return all transactions sorted by transaction_date (newest first)
	// Includes the most recent category assignment for each transaction
	async getAllSorted() {
		const rows = await prisma.transaction.findMany({
			include: {
				Transaction_Category: {
					select: {
						category_id: true,
						created_at: true
					},
					orderBy: { created_at: 'desc' },
					take: 1
				}
			},
			orderBy: { transaction_date: 'desc' }
		})

		console.log(`Fetched ${rows.length} total transactions.`)
		
		// Map to include currentCategoryId at the top level
		return rows.map(row => ({
			...row,
			currentCategoryId: row.Transaction_Category[0]?.category_id || null,
			Transaction_Category: undefined // Remove the full relation from response
		}))
	}

	async getAllByMonth(year: number, month: number) {
		// Start of month (YYYY-MM-01)
		const startDate = new Date(year, month - 1, 1)

		// Start of next month
		const endDate = new Date(year, month, 1)

		const rows = await prisma.transaction.findMany({
			where: {
			transaction_date: {
				gte: startDate,
				lt: endDate
			}
			},
			include: {
			Transaction_Category: {
				select: {
				category_id: true,
				created_at: true
				},
				orderBy: { created_at: 'desc' },
				take: 1
			}
			},
			orderBy: { transaction_date: 'desc' }
		})

		console.log(`Fetched ${rows.length} transactions for ${year}-${month}.`)

		return rows.map(row => ({
			...row,
			currentCategoryId: row.Transaction_Category[0]?.category_id || null,
			Transaction_Category: undefined
		}))
	}

}
