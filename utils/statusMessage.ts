interface PastMonthStatusInput {
  monthName: string
  totalIncome: number
  totalExpenses: number
}

interface CurrentMonthStatusInput extends PastMonthStatusInput {
  dayOfMonth: number
}

export function getCurrentMonthStatusMessage({
  monthName,
  dayOfMonth,
  totalIncome,
  totalExpenses,
}: CurrentMonthStatusInput) {
  const remainingRatio = (totalIncome - totalExpenses) / totalIncome
  const remainingPercentage = Math.round(Math.min(Math.max(remainingRatio * 100, 0), 100))

  if (dayOfMonth <= 10) {
    return remainingRatio >= 0.4
      ? {
          headline: `${monthName} is looking decent so far!`,
          subtitle: `${remainingPercentage}% of your income is still unspent.`,
        }
      : {
          headline: `${monthName} spending is a bit high.`,
          subtitle: `${remainingPercentage}% of your income is left.`,
        }
  }

  if (dayOfMonth <= 20) {
    return remainingRatio >= 0.3
      ? {
          headline: `${monthName} is going well!`,
          subtitle: `${remainingPercentage}% of your income is still unspent.`,
        }
      : {
          headline: `${monthName} is looking shaky.`,
          subtitle: `${remainingPercentage}% of your income is left.`,
        }
  }

  return remainingRatio >= 0.15
    ? {
        headline: `${monthName} is shaping up!`,
        subtitle: `${remainingPercentage}% of your income is still unspent.`,
      }
    : {
        headline: `${monthName} could be slipping.`,
        subtitle: `${remainingPercentage}% of your income is left.`,
      }
}

export function getPastMonthStatusMessage({
  monthName,
  totalIncome,
  totalExpenses,
}: PastMonthStatusInput) {
  const amountSaved = totalIncome - totalExpenses

  if (amountSaved < 0) return {
    headline: `${monthName} was tough.`,
    subtitle: 'Your expenses exceeded your income.',
  }

  const savedRatio = amountSaved / Math.max(totalIncome, 1)
  const savedPercentage = Math.round(savedRatio * 100)
  const subtitle = `You saved ${savedPercentage}% of your income!`

  if (savedRatio < 0.15) return {
    headline: `${monthName} was close.`,
    subtitle,
  }

  if (savedRatio < 0.35) return {
    headline: `${monthName} was solid.`,
    subtitle,
  }

  if (savedRatio < 0.55) return {
    headline: `${monthName} was strong!`,
    subtitle,
  }

  return {
    headline: `${monthName} was outstanding!`,
    subtitle,
  }
}
