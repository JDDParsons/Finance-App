import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useFinanceStore } from '~/stores/finance'
import { useProfileStore } from '~/stores/profile'

export function useStatusMessage(
  totalIncome: ComputedRef<number>,
  totalExpenses: ComputedRef<number>,
) {
  const store = useFinanceStore()
  const profileStore = useProfileStore()

  const firstName = computed(() => profileStore.profile?.first_name ?? 'there')

  const isCurrentMonth = computed(() => {
    const now = new Date()
    return store.selectedMonth.year === now.getFullYear() &&
      store.selectedMonth.month === now.getMonth() + 1
  })

  const rawRemaining = computed(() => totalIncome.value - totalExpenses.value)
  const remainingRatio = computed(() => rawRemaining.value / Math.max(totalIncome.value, 1))

  const totalBudgeted = computed(() =>
    store.budgets.reduce((sum, b) => sum + (Number(b.currentPeriod?.amount) || 0), 0)
  )

  // Does the spending plan itself fit within income? Immune to front-loaded expenses (e.g. rent).
  const budgetProjectedBalance = computed(() => totalIncome.value - totalBudgeted.value)

  const statusMessage = computed(() => {
    const name = firstName.value
    const ratio = remainingRatio.value
    const past = !isCurrentMonth.value

    if (totalIncome.value === 0) return {
      headline: `Hey, ${name}!`,
      subtitle: past
        ? 'No income was recorded for this month.'
        : 'Add your income to get personalized insights.'
    }
    // Overspent — actual expenses exceeded income
    if (rawRemaining.value < 0) return {
      headline: `Tough month, ${name}.`,
      subtitle: past
        ? 'Expenses outpaced income that month.'
        : 'Expenses have outpaced income this month.'
    }
    // Budget plan exceeds income (only meaningful for current month)
    if (!past && budgetProjectedBalance.value < 0) return {
      headline: `Your plan's over budget, ${name}.`,
      subtitle: 'Your budget allocations add up to more than your income.'
    }
    // Critical — under 5% remaining
    if (ratio < 0.05) return {
      headline: past ? `Close call, ${name}.` : `Down to the wire, ${name}.`,
      subtitle: past
        ? 'You came within a hair of spending everything that month.'
        : 'Almost nothing left — watch every dollar from here.'
    }
    // Tight — under 15% remaining
    if (ratio < 0.15) return {
      headline: past ? `Cut it close, ${name}.` : `Keep it tight, ${name}.`,
      subtitle: past
        ? 'You finished the month spending close to your limit.'
        : "You're spending close to your limit — stay careful."
    }
    // Steady — 15–35% remaining
    if (ratio < 0.35) return {
      headline: past ? `Solid month, ${name}.` : `Keep it steady, ${name}.`,
      subtitle: past
        ? 'You saved a portion of your income that month.'
        : "You're on track to save some of your income."
    }
    // Strong — 35–55% remaining
    if (ratio < 0.55) return {
      headline: past ? `Strong month, ${name}.` : `Still going strong, ${name}.`,
      subtitle: past
        ? 'You finished well in the green that month.'
        : "At this rate you'll finish well in the green."
    }
    // Excellent — 55%+ remaining
    return {
      headline: past ? `Outstanding month, ${name}.` : `Crushing it, ${name}.`,
      subtitle: past
        ? 'More than half your income went unspent — excellent discipline.'
        : 'More than half your income is still unspent — great discipline.'
    }
  })

  return { statusMessage, isCurrentMonth, rawRemaining, remainingRatio, budgetProjectedBalance }
}
