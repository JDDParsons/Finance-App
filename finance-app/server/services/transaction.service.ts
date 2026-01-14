// Service layer for transactions. 
import { prisma } from '../api/prisma'

export class TransactionService {
	// Return all transactions sorted by transaction_date (newest first)
	async getAllSorted() {
		const rows = await prisma.transaction.findMany({
			orderBy: { transaction_date: 'desc' }
		})
		return rows
	}
}
