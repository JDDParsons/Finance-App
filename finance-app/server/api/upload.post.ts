// server/api/upload.post.ts
import { TransactionService } from '../services/transaction.service'


export default defineEventHandler(async (event) => {

  // Parse the multipart form data to get the uploaded file
  const form = await readMultipartFormData(event);
  const file = form?.find(f => f.name === 'file');

  // Handle missing file
  if (!file) throw createError({ statusCode: 400, statusMessage: "No file uploaded" });

  // Initialize the transaction service
  const service = new TransactionService();

  // Parse the CSV content
  const parsedData = service.parseCsv(file.data.toString('utf8'), file?.filename || '');

  // Insert parsed rows into the database
  const insertResult = await service.insertTransactions(parsedData);

  return {
    message: "File parsed and inserted successfully",
    rows: parsedData.length,
    inserted: insertResult,
    preview: parsedData.slice(0, 3) // first few rows
  }
})
