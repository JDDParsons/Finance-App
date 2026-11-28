interface RemainingFundsInput {
  income: number
  expenses: number
  monthName: string
}

/**
 * What the home page's remaining card says. The amount is signed and in whole
 * dollars, so an amount that rounds to nothing is never shown as overspent.
 */
export function describeRemaining({ income, expenses, monthName }: RemainingFundsInput) {
  // `|| 0` turns -0 into 0.
  const amount = Math.round(income - expenses) || 0
  const isOverspent = amount < 0

  return {
    amount,
    isOverspent,
    label: isOverspent ? `Overspent in ${monthName}` : `Remaining for ${monthName}`,
  }
}

/** Dollars without a sign: the card's label says whether it is left or overspent. */
export function formatWholeDollars(amount: number) {
  return `$${Math.abs(Math.round(amount)).toLocaleString('en-US')}`
}

/** The value part way through a count from one amount to another, easing out. */
export function countUpValue(from: number, to: number, progress: number) {
  const clamped = Math.min(Math.max(progress, 0), 1)
  return from + (to - from) * (1 - (1 - clamped) ** 3)
}
