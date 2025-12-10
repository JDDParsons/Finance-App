import { prisma } from '../api/prisma'
import { parse as csvParse } from 'csv-parse/sync'
import { parseFinanceData } from '../../utils/parse'

export type ParsedItem = {
    Id: string;
    TextId: string;
    TransactionDate: string; // YYYY-MM-DD
    Description: string;
    AmountAdded: string | number | null;
    AmountDeducted: string | number | null;
    Category?: string | null;
}

export class TransactionService {
  
  // Parses CSV string content into structured data
  parseCsv(csvString: string, filename: string) {
    const records = csvParse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    return parseFinanceData(records, filename)
  }
  
  // Inserts parsed transaction items into the database
  async insertTransactions(items: ParsedItem[]) {
    if (!items || items.length === 0) return { count: 0 };

    const data = items.map((it, idx) => {

      const amount_added = it.AmountAdded === "" || it.AmountAdded === null || it.AmountAdded === undefined
        ? null
        : (typeof it.AmountAdded === 'string') ? it.AmountAdded : String(it.AmountAdded);

      const amount_deducted = it.AmountDeducted === "" || it.AmountDeducted === null || it.AmountDeducted === undefined
        ? null
        : (typeof it.AmountDeducted === 'string') ? it.AmountDeducted : String(it.AmountDeducted);

      return {
        id: it.Id,
        amount_added,
        amount_deducted,
        text_id: it.TextId,
        description: it.Description,
        transaction_date: new Date(it.TransactionDate),
        category: it.Category || null,
      }
    })

    // Use createMany to insert in bulk
    const result = await prisma.transaction.createMany({
      data,
      skipDuplicates: true,
    })

    return result;
  }
}
