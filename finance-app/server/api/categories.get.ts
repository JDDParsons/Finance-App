import { prisma } from './prisma'

export default defineEventHandler(async () => {
  const categories = await prisma.category.findMany({
    orderBy: { label: 'asc' }
  })
  return categories
})
