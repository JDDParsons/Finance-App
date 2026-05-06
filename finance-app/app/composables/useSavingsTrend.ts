import { computed } from 'vue'
import type { ComputedRef } from 'vue'

interface ChartMonth {
  label: string
  savings: number
  hasData: boolean
}

function fmt(value: number) {
  const abs = Math.abs(value)
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K` : `$${abs.toFixed(0)}`
  return value < 0 ? `-${s}` : s
}

export function useSavingsTrend(chartMonths: ComputedRef<ChartMonth[]>) {
  const savingsTrend = computed(() => {
    const months = chartMonths.value.filter(m => m.hasData)

    if (months.length === 0) return {
      headline: 'No savings history yet.',
      subtitle: 'Add income and expenses to start tracking your savings trend.',
      tone: 'neutral' as const
    }

    if (months.length === 1) {
      const m = months[0]
      return m.savings >= 0
        ? { headline: 'One month of data so far.', subtitle: `You saved ${fmt(m.savings)} in ${m.label}.`, tone: 'positive' as const }
        : { headline: 'One month of data so far.', subtitle: `You overspent by ${fmt(Math.abs(m.savings))} in ${m.label}.`, tone: 'warning' as const }
    }

    const total = months.reduce((s, m) => s + m.savings, 0)
    const positiveCount = months.filter(m => m.savings > 0).length
    const negativeCount = months.length - positiveCount

    // Trend: compare average of older half vs newer half
    const half = Math.floor(months.length / 2)
    const olderAvg = months.slice(0, half).reduce((s, m) => s + m.savings, 0) / half
    const newerAvg = months.slice(-half).reduce((s, m) => s + m.savings, 0) / half
    const delta = newerAvg - olderAvg
    const isTrendingUp = delta > 50
    const isTrendingDown = delta < -50

    const positiveRatio = positiveCount / months.length
    const n = months.length

    // All positive
    if (negativeCount === 0) return {
      headline: `${n} months in the green.`,
      subtitle: `Consistent saving across every month shown — ${fmt(total)} net over this period.`,
      tone: 'positive' as const
    }

    // All negative
    if (positiveCount === 0) return {
      headline: 'Every month has been a loss.',
      subtitle: `Expenses have outpaced income across all ${n} months shown. Consider reviewing your budget.`,
      tone: 'warning' as const
    }

    // Trending up, majority positive
    if (isTrendingUp && positiveRatio >= 0.5) return {
      headline: "Savings are trending upward.",
      subtitle: `Recent months have been stronger than earlier ones — ${fmt(total)} saved in total.`,
      tone: 'positive' as const
    }

    // Trending down
    if (isTrendingDown) return {
      headline: "Savings are slipping.",
      subtitle: `Recent months look weaker than earlier ones. Worth reviewing what changed.`,
      tone: 'warning' as const
    }

    // Mostly positive (≥ 2/3)
    if (positiveRatio >= 0.667) return {
      headline: `Mostly in the green.`,
      subtitle: `${positiveCount} out of ${n} months were positive — ${fmt(total)} net over this period.`,
      tone: 'positive' as const
    }

    // Mixed
    return {
      headline: 'Mixed results over this period.',
      subtitle: `${positiveCount} positive, ${negativeCount} negative — ${fmt(total)} net overall.`,
      tone: (total >= 0 ? 'positive' : 'warning') as 'positive' | 'warning'
    }
  })

  return { savingsTrend }
}
