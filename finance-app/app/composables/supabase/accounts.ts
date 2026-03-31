import { getSupabase, resolveHouseholdId, getCachedHouseholdId } from './client'

async function getLatestAccountValueRecord(
  supabase: ReturnType<typeof getSupabase>,
  accountId: string
) {
  const { data, error } = await supabase
    .from('Account_Value')
    .select('id, created_at, baseline_amount, cumulative_amount, account_id, user_id')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

async function getLatestAccountValueMap(
  supabase: ReturnType<typeof getSupabase>,
  accountIds: string[]
) {
  const uniqueAccountIds = [...new Set(accountIds.filter(Boolean))]
  if (uniqueAccountIds.length === 0) return new Map<string, any>()

  const { data, error } = await supabase
    .from('Account_Value')
    .select('id, created_at, baseline_amount, cumulative_amount, account_id, user_id')
    .in('account_id', uniqueAccountIds)
    .order('created_at', { ascending: false })

  if (error) throw error

  const latestByAccountId = new Map<string, any>()
  for (const row of data || []) {
    if (row?.account_id && !latestByAccountId.has(row.account_id)) {
      latestByAccountId.set(row.account_id, row)
    }
  }

  return latestByAccountId
}

async function saveAccountValue(
  supabase: ReturnType<typeof getSupabase>,
  accountId: string,
  baselineAmount: number | null,
  cumulativeAmount: number | null,
  userId: string | null | undefined
) {
  const existing = await getLatestAccountValueRecord(supabase, accountId)

  if (existing) {
    const { data, error } = await supabase
      .from('Account_Value')
      .update({
        baseline_amount: baselineAmount,
        cumulative_amount: cumulativeAmount,
        user_id: existing.user_id ?? userId ?? null,
        household_id: getCachedHouseholdId() ?? null,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('Account_Value')
    .insert({
      account_id: accountId,
      baseline_amount: baselineAmount,
      cumulative_amount: cumulativeAmount,
      user_id: userId ?? null,
      household_id: getCachedHouseholdId() ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAccounts() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('Account')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error

  const accounts = data || []
  const accountValues = await getLatestAccountValueMap(
    supabase,
    accounts.map((account: any) => account.id)
  )

  return accounts.map((account: any) => {
    const accountValue = accountValues.get(account.id)
    return {
      ...account,
      baseline_amount: accountValue?.baseline_amount ?? null,
      cumulative_amount: accountValue?.cumulative_amount ?? null,
    }
  })
}

export async function createAccount(
  name: string,
  institution: string,
  baselineAmount: string,
  cardNumber: string,
  isCreditCard: boolean,
  isDefaultForExpenses: boolean,
  isDefaultForIncome: boolean
) {
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getSession()
  const householdId = await resolveHouseholdId()
  const parsed = baselineAmount ? parseFloat(baselineAmount) : null
  const { data, error } = await supabase
    .from('Account')
    .insert({
      name: name || null,
      institution: institution || null,
      card_number: cardNumber || null,
      is_credit_card: isCreditCard,
      is_default_for_expenses: isDefaultForExpenses,
      is_default_for_income: isDefaultForIncome,
      user_id: auth.session?.user?.id,
      household_id: householdId
    })
    .select()
    .single()
  if (error) throw error

  await saveAccountValue(
    supabase,
    data.id,
    parsed,
    parsed,
    auth.session?.user?.id
  )

  return {
    ...data,
    baseline_amount: parsed,
    cumulative_amount: parsed,
  }
}

export async function updateAccount(
  id: string,
  name: string,
  institution: string,
  cardNumber: string,
  isCreditCard: boolean,
  isDefaultForExpenses: boolean,
  isDefaultForIncome: boolean
) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('Account')
    .update({
      name: name || null,
      institution: institution || null,
      card_number: cardNumber || null,
      is_credit_card: isCreditCard,
      is_default_for_expenses: isDefaultForExpenses,
      is_default_for_income: isDefaultForIncome,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  const accountValue = await getLatestAccountValueRecord(supabase, id)

  return {
    ...data,
    baseline_amount: accountValue?.baseline_amount ?? null,
    cumulative_amount: accountValue?.cumulative_amount ?? null,
  }
}

export async function updateAccountBaseline(id: string, baselineAmount: string) {
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getSession()
  const parsed = baselineAmount ? parseFloat(baselineAmount) : null

  const data = await saveAccountValue(
    supabase,
    id,
    parsed,
    parsed,
    auth.session?.user?.id
  )

  return {
    baseline_amount: data?.baseline_amount ?? parsed,
    cumulative_amount: data?.cumulative_amount ?? parsed,
  }
}

export async function deleteAccount(id: string) {
  const supabase = getSupabase()
  const { error: accountValueError } = await supabase
    .from('Account_Value')
    .delete()
    .eq('account_id', id)
  if (accountValueError) throw accountValueError

  const { error } = await supabase
    .from('Account')
    .delete()
    .eq('id', id)
  if (error) throw error
}
