import type { SupabaseClient } from '@supabase/supabase-js'

function getClient(supabase: SupabaseClient) {
  return supabase.schema('finance-app')
}

async function getLatestAccountValueRecord(supabase: SupabaseClient, accountId: string) {
  const { data, error } = await getClient(supabase)
    .from('Account_Value')
    .select('id, created_at, baseline_amount, cumulative_amount, account_id, user_id')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

async function getLatestAccountValueMap(supabase: SupabaseClient, accountIds: string[]) {
  const uniqueAccountIds = [...new Set(accountIds.filter(Boolean))]
  if (uniqueAccountIds.length === 0) return new Map<string, any>()

  const { data, error } = await getClient(supabase)
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
  supabase: SupabaseClient,
  accountId: string,
  baselineAmount: number | null,
  cumulativeAmount: number | null,
  userId: string | null | undefined,
  householdId: string | null
) {
  const existing = await getLatestAccountValueRecord(supabase, accountId)

  if (existing) {
    const { data, error } = await getClient(supabase)
      .from('Account_Value')
      .update({
        baseline_amount: baselineAmount,
        cumulative_amount: cumulativeAmount,
        user_id: existing.user_id ?? userId ?? null,
        household_id: householdId,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await getClient(supabase)
    .from('Account_Value')
    .insert({
      account_id: accountId,
      baseline_amount: baselineAmount,
      cumulative_amount: cumulativeAmount,
      user_id: userId ?? null,
      household_id: householdId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAccounts(supabase: SupabaseClient) {
  const { data, error } = await getClient(supabase)
    .from('Account')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error

  const accounts = data || []
  const accountValues = await getLatestAccountValueMap(supabase, accounts.map((a: any) => a.id))

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
  supabase: SupabaseClient,
  userId: string,
  householdId: string,
  name: string,
  institution: string,
  baselineAmount: string,
  cardNumber: string,
  isCreditCard: boolean,
  isDefaultForExpenses: boolean,
  isDefaultForIncome: boolean
) {
  const parsed = baselineAmount ? parseFloat(baselineAmount) : null
  const { data, error } = await getClient(supabase)
    .from('Account')
    .insert({
      name: name || null,
      institution: institution || null,
      card_number: cardNumber || null,
      is_credit_card: isCreditCard,
      is_default_for_expenses: isDefaultForExpenses,
      is_default_for_income: isDefaultForIncome,
      user_id: userId,
      household_id: householdId,
    })
    .select()
    .single()
  if (error) throw error

  await saveAccountValue(supabase, data.id, parsed, parsed, userId, householdId)

  return {
    ...data,
    baseline_amount: parsed,
    cumulative_amount: parsed,
  }
}

export async function updateAccount(
  supabase: SupabaseClient,
  id: string,
  name: string,
  institution: string,
  cardNumber: string,
  isCreditCard: boolean,
  isDefaultForExpenses: boolean,
  isDefaultForIncome: boolean
) {
  const { data, error } = await getClient(supabase)
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

export async function updateAccountBaseline(
  supabase: SupabaseClient,
  userId: string,
  householdId: string,
  id: string,
  baselineAmount: string
) {
  const parsed = baselineAmount ? parseFloat(baselineAmount) : null
  const data = await saveAccountValue(supabase, id, parsed, parsed, userId, householdId)

  return {
    baseline_amount: data?.baseline_amount ?? parsed,
    cumulative_amount: data?.cumulative_amount ?? parsed,
  }
}

export async function deleteAccount(supabase: SupabaseClient, id: string) {
  const { error: accountValueError } = await getClient(supabase)
    .from('Account_Value')
    .delete()
    .eq('account_id', id)
  if (accountValueError) throw accountValueError

  const { error } = await getClient(supabase)
    .from('Account')
    .delete()
    .eq('id', id)
  if (error) throw error
}
