import { prisma } from './prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { transactionId, categoryId } = body

  if (!transactionId || !categoryId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing transactionId or categoryId'
    })
  }

  try {
    // Check if a record already exists for this transaction
    const existing = await prisma.Transaction_Category.findFirst({
      where: {
        transaction_id: transactionId
      }
    })

    if (existing) {
      // Update existing record
      const updated = await prisma.Transaction_Category.update({
        where: { id: existing.id },
        data: { category_id: categoryId }
      })
      return updated
    } else {
      // Create new record
      const created = await prisma.Transaction_Category.create({
        data: {
          transaction_id: transactionId,
          category_id: categoryId
        }
      })
      return created
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update category: ' + error.message
    })
  }
})
