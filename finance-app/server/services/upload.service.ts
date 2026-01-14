import { prisma } from '../api/prisma'
import { parse as csvParse } from 'csv-parse/sync'
import { parseFinanceData, ParsedItem as ParsedItemFromUtil, InputRecord } from '../../utils/parse'

export class UploadService {
  
  // Parses CSV string content into structured data
  parseCsv(csvString: string, filename: string): ParsedItemFromUtil[] {
    const records = csvParse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
    return parseFinanceData(records as InputRecord[], filename)
  }
  
  // Inserts parsed transaction items into the database
  async insertTransactions(items: ParsedItemFromUtil[]) {
    if (!items || items.length === 0) return { count: 0 };

    const data = items.map((it) => {

      const payload = {
        id: it.Id,
        group: it.Group,
        group_id: it.GroupId,
        amount: it.Amount,
        description: it.Description,
        transaction_date: new Date(it.TransactionDate)
      }

      return payload
    })

    await Promise.all(
      data.map(item =>
        prisma.transaction.upsert({
          where: { id: item.id },
          update: item as any,
          create: item as any,
        })
      )
    )

    const result = await prisma.transaction.count({
      where: {
        id: { in: data.map(d => d.id) }
      }
    })

    return result
  }
}
