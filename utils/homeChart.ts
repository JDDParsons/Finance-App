interface DonutIncomeInput {
  isCurrentMonth: boolean
  actualIncome: number
  budgetedIncome: number
}

export function resolveDonutIncome({
  isCurrentMonth,
  actualIncome,
  budgetedIncome,
}: DonutIncomeInput) {
  const usesActualIncome = !isCurrentMonth || actualIncome > budgetedIncome

  return {
    amount: usesActualIncome ? actualIncome : budgetedIncome,
    label: usesActualIncome ? 'Real income' : 'Planned income',
  }
}
