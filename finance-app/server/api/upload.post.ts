// server/api/upload.post.ts
import { parse } from 'csv-parse/sync'
import { parseFinanceData } from '../../utils/parse'
import { deterministicUuid } from '../../utils/uuid'


export default defineEventHandler(async (event) => {

  // Parse the multipart form data to get the uploaded file
  const form = await readMultipartFormData(event)

  const file = form?.find(f => f.name === 'file')

  if (!file) throw createError({ statusCode: 400, statusMessage: "No file uploaded" })

  const csvString = file.data.toString('utf8')

  const records = parse(csvString, {
    columns: true,       // Interpret first row as headers
    skip_empty_lines: true,
    trim: true
  })

  const parsedData = parseFinanceData(records, file?.filename || '');
  console.log(JSON.stringify(parsedData, null, 2))

  return {
    message: "File parsed successfully",
    rows: parsedData.length,
    preview: parsedData.slice(0, 3) // first few rows
  }
})
