import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useFinanceStore } from '~/stores/finance'
import { useProfileStore } from '~/stores/profile'
import { getCurrentMonthStatusMessage, getPastMonthStatusMessage } from '../../utils/statusMessage'

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

  const selectedMonthName = computed(() => {
    const { year, month } = store.selectedMonth
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
      month: 'long',
      timeZone: 'UTC',
    })
  })

  const pastMonthStatusMessage = computed(() => {
    return getPastMonthStatusMessage({
      monthName: selectedMonthName.value,
      totalIncome: totalIncome.value,
      totalExpenses: totalExpenses.value,
    })
  })

  const currentMonthStatusMessage = computed(() => {
    const name = firstName.value

    if (totalIncome.value === 0) return {
      headline: `Hey, ${name}!`,
      subtitle: 'Add your income to get personalized insights.'
    }

    return getCurrentMonthStatusMessage({
      monthName: selectedMonthName.value,
      dayOfMonth: new Date().getDate(),
      totalIncome: totalIncome.value,
      totalExpenses: totalExpenses.value,
    })
  })

  const statusMessage = computed(() => isCurrentMonth.value
    ? currentMonthStatusMessage.value
    : pastMonthStatusMessage.value
  )

  return { statusMessage, isCurrentMonth, rawRemaining, remainingRatio, budgetProjectedBalance }
}
