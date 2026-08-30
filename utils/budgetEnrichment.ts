export function enrichBudgets(rawBudgets: any[], hits: any[], year: number, month: number) {
  return rawBudgets.map(budget => {
    const budgetHitList = hits.filter(hit => hit.budget_id === budget.id)
    const totalHitAmount = budgetHitList.reduce((sum, hit) => {
      const date = new Date((hit.date as string).replace(/-/g, '/'))
      const matches = date.getFullYear() === year && (date.getMonth() + 1) === month
      return matches ? sum + (Number(hit.amount) || 0) : sum
    }, 0)
    const totalRemainingAmount = (budget.currentPeriod?.amount || 0) - totalHitAmount
    const progress = budget.currentPeriod?.amount
      ? (totalHitAmount / budget.currentPeriod.amount) * 100
      : 0

    return {
      ...budget,
      hits: budgetHitList,
      totalHitAmount,
      totalRemainingAmount,
      numberOfHits: budgetHitList.length,
      progress,
    }
  })
}
