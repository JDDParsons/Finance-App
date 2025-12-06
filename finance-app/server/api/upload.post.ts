// server/api/upload.post.ts
import { parse } from 'csv-parse/sync'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)

  const file = form?.find(f => f.name === 'file')

  if (!file) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded" })
  }

  // Convert buffer → string
  const csvString = file.data.toString('utf8')

  // Parse the CSV
  const records = parse(csvString, {
    columns: true,       // Interpret first row as headers
    skip_empty_lines: true,
    trim: true
  })

  // Debug: print the parsed CSV rows to the server console
  console.log("Parsed records:", records)

  return {
    message: "File parsed successfully",
    rows: records.length,
    preview: records.slice(0, 3) // first few rows
  }
})
