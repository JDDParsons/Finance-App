type Transaction = {
  currentCategoryId: string | null
  [key: string]: any
}

type Category = {
  id: string
  label: string
}

export function attachCategoryLabel(
  transData: Transaction[],
  catData: Category[]
) {
  // Build lookup table: id → label
  const categoryMap = new Map<string, string>(
    catData.map(cat => [cat.id, cat.label])
  )

  // Transform transactions
  return transData.map(({ currentCategoryId, ...rest }) => ({
    ...rest,
    category: currentCategoryId
      ? categoryMap.get(currentCategoryId) ?? null
      : null
  }))
}