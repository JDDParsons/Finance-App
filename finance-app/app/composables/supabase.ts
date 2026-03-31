import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse';

function getSupabase() {
    const config = useRuntimeConfig()

    return createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey
  )
}

// --- Household ID cache ---
let _householdId: string | null = null

export function setHouseholdId(id: string | null) {
  _householdId = id
}

export function getCachedHouseholdId(): string | null {
  return _householdId
}

export async function resolveHouseholdId(): Promise<string> {
  if (_householdId) return _householdId
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getSession()
  const userId = auth.session?.user?.id
  if (!userId) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('Household_Member')
    .select('household_id')
    .eq('user_id', userId)
    .single()
  if (error || !data?.household_id) throw new Error('No household found for user')
  _householdId = data.household_id as string
  return _householdId
}


  // Return all transactions sorted by date (newest first)
  export async function getAllSorted() {
    const supabase = getSupabase()
    const { data: transactions, error } = await supabase
      .from('Transaction')
      .select('*')
      .order('transaction_date', { ascending: false })

    if (error) throw error

    console.log(`Fetched ${transactions?.length ?? 0} total transactions.`)

    return attachLatestCategory(transactions || [])
  }

    export async function getAllByMonth(year: number, month: number) {
        const supabase = getSupabase()
        const startDate = new Date(year, month - 1, 1).toISOString()
        const endDate = new Date(year, month, 1).toISOString()

        const { data: transactions, error } = await supabase
        .from('Transaction')
        .select('*')
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate)
        .order('transaction_date', { ascending: false })

        if (error) throw error

        console.log(
        `Fetched ${transactions?.length ?? 0} transactions for ${year}-${month}.`
        )

        return attachLatestCategory(transactions || [])
    }

  
  // Helper to attach latest category to transactions
    async function attachLatestCategory(transactions: any[]) {
    const supabase = getSupabase()
    const ids = transactions.map(t => t.id)

    const { data: txCats, error } = await (supabase as any).rpc('get_transaction_categories', { transaction_ids: ids });
    if (error) throw error

    // Pick latest category per transaction
    const latestMap = new Map<string, string>()

    for (const row of txCats || []) {
      if (!latestMap.has(row.transaction_id)) {
        latestMap.set(row.transaction_id, row.category_id)
      }
    }

    return transactions.map(t => ({
      ...t,
      currentCategoryId: latestMap.get(t.id) || null
    }))
  }

  // Fetch categories ordered by label and map to { id, name } for compatibility
  export async function getCategories() {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('Category')
      .select('id,label')
      .order('label', { ascending: true })

    if (error) throw error

    return (data || []).map((c: any) => ({ id: c.id, label: c.label }))
  }

  // Get statement groups and transform/sort (copied from server implementation)
  export async function getStatementGroups() {
    const supabase = getSupabase()
    const { data: groups, error } = await supabase
      .from('Transaction_Groups')
      .select('*')

    if (error) throw error

    const MONTHS: Record<string, string> = {
      JAN: 'January', FEB: 'February', MAR: 'March', APR: 'April', MAY: 'May', JUN: 'June',
      JUL: 'July', AUG: 'August', SEP: 'September', OCT: 'October', NOV: 'November', DEC: 'December'
    }

    function titleCaseToken(token: string): string {
      return token
        .replace(/_/g, ' ')
        .split(/(\s+)/)
        .map((t: string | undefined) => {
          const s = t ?? ''
          return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
        })
        .join('')
    }

    const items: Array<{ year: number | null; month: string | null; name: string; transactions: number; rawGroup: string; dateUploaded: string | null; }> = (groups || []).map((g: any) => {
      const raw = (g.group ?? '') as string

      const parts = raw.split('_')
      let year: number | null = null
      let month: string | null = null
      let nameParts: string[] = []

      if (parts.length >= 2) {
        const last = parts[parts.length - 1] ?? ''
        const secondLast = parts[parts.length - 2] ?? ''

        if (/^\d{4}$/.test(last)) {
          year = Number(last)
          const mon = secondLast.toUpperCase()
          month = MONTHS[mon] ?? null
          nameParts = parts.slice(0, parts.length - 2)
        } else {
          nameParts = parts.slice(0, parts.length - 1)
          const mon = last.toUpperCase()
          month = MONTHS[mon] ?? null
        }
      } else {
        nameParts = parts
      }

      const rawName = nameParts.join('_')
      const name = rawName
        .split('_')
        .map(p => p.split('-').map(titleCaseToken).join('-'))
        .join(' ')

      const createdAt = g.first_created_at ?? null
      return {
        year,
        month,
        name,
        transactions: Number(g.id_count ?? 0),
        rawGroup: raw,
        dateUploaded: createdAt ? (new Date(createdAt)).toISOString() : null,
      }
    })

    const MONTH_NAME_TO_INDEX: Record<string, number> = {}
    Object.values(MONTHS).forEach((m, i) => { MONTH_NAME_TO_INDEX[m] = i + 1 })

    items.sort((a, b) => {
      const ay = a.year ?? -9999
      const by = b.year ?? -9999
      if (by !== ay) return by - ay

      const ai = a.month ? (MONTH_NAME_TO_INDEX[a.month] ?? 0) : 0
      const bi = b.month ? (MONTH_NAME_TO_INDEX[b.month] ?? 0) : 0
      if (bi !== ai) return bi - ai

      return a.name.localeCompare(b.name)
    })

    return items
  }

  // Upsert a transaction category (create or update)
  export async function setTransactionCategory(transactionId: string, categoryId: string) {
    const supabase = getSupabase()
    if (!transactionId || !categoryId) throw new Error('Missing transactionId or categoryId')

    // Check for existing record
    const { data: existing, error: selErr } = await (supabase as any)
      .from('Transaction_Category')
      .select('*')
      .eq('transaction_id', transactionId)
      .maybeSingle()

    if (selErr) throw selErr

    if (existing) {
      const { data, error } = await (supabase as any)
        .from('Transaction_Category')
        .update({ category_id: categoryId } as any)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await (supabase as any)
        .from('Transaction_Category')
        .insert({ transaction_id: transactionId, category_id: categoryId } as any)
        .select()
        .single()
      if (error) throw error
      return data
    }
  }

  // Upload a CSV File (read in browser, parse and insert transactions)
  export async function uploadFile(file: File) {
    const supabase = getSupabase()
    const text = await file.text()
    
    // Import parser lazily to avoid bundling surprises
    const results = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(), // Replaces trim: true for headers
    });

    const records = results.data;

    // Reuse existing parse logic
    const { parseFinanceData } = await import('../../utils/parse')
    const parsed = parseFinanceData(records as any[], file.name)

    if (!parsed || parsed.length === 0) return { count: 0 }

    const { data: auth } = await supabase.auth.getSession(); 
    const householdId = await resolveHouseholdId()

    const data = parsed.map((it: any) => ({
      id: it.Id,
      group: it.Group,
      group_id: it.GroupId,
      amount: it.Amount,
      description: it.Description,
      transaction_date: new Date(it.TransactionDate),
      user_id: auth.session?.user?.id,
      household_id: householdId
    }))

    const { count, error } = await (supabase as any)
      .from('Transaction')
      .upsert(data as any, { onConflict: 'id', count: 'exact' })

    if (error) throw error
    return { count }
  }

  // Send magic link for email authentication
  export async function sendMagicLink(email: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!email) {
        return { success: false, message: 'Please enter a valid email address.' }
      }

      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.href : ''
        }
      })

      if (error) {
        return { success: false, message: 'Error sending magic link: ' + error.message }
      }

      return { success: true, message: 'Magic link sent! Please check your email.' }
    } catch (err: any) {
      return { success: false, message: 'Error: ' + (err?.message || 'Unknown error') }
    }
  }

  export async function validateCode(email: string, code: string) {
    try {
      const supabase = getSupabase()
      const { data: { session }, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code, // The 6-digit code from the email
        type: 'email',   // Crucial: Use 'email' for OTP codes
      })
      return { session, error };

    } catch (err: any) {
      console.error('Error validating code:', err)
      throw new Error('Invalid code or error during validation.')
    }
  }

  export async function getSession() {
    const supabase = getSupabase()
    const { data: auth } = await supabase.auth.getSession()
    return auth.session
  }

  export async function signOut() {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setHouseholdId(null)
    window.location.href = '/'; 
  }

  export async function createBudget(name: string, amount: string) {
    const supabase = getSupabase()
    const { data: auth } = await supabase.auth.getSession(); 
    const householdId = await resolveHouseholdId()
    const { data, error } = await supabase
      .from('Budgets')
      .insert({
        name,
        amount: parseFloat(amount),
        user_id: auth.session?.user?.id,
        household_id: householdId
      })
      .select()
      .single()

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    // Format back to YYYY-MM-DD
    const year = firstDay.getFullYear();
    const month = String(firstDay.getMonth() + 1).padStart(2, '0');
    const day = '01';

    const result = `${year}-${month}-${day}`;   

    const {data: periodData, error: periodError} = await supabase
      .from('Budget_Period')
      .insert({ 
        budget_id: data?.id, 
        date: result,
        amount: parseFloat(amount),
        user_id: auth.session?.user?.id,
        household_id: householdId
       })
      .select()
      .single()

    if (periodError) throw periodError
    if (error) throw error

    return {data: data, periodData: periodData}
  }

  export async function getBudgets() {
    const supabase = getSupabase()
    const { data: budgets, error } = await supabase
      .from('Budgets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const {data: budgetPeriods, error: periodError} = await supabase
      .from('Budget_Period')
      .select('*')  

    if (periodError) throw periodError

    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const currentMonthFirstDate = new Date(currentYear, currentMonth - 1, 1)
    const formattedDate = currentMonthFirstDate.toISOString().split('T')[0]

    for (const b of budgets) {
      b.currentPeriod = budgetPeriods?.find((p: any) => p.budget_id === b.id && p.date === formattedDate) || null
      
      if (!b.currentPeriod) {
        const { data: newPeriod, error: newPeriodError } = await supabase
          .from('Budget_Period')
          .insert({ 
            budget_id: b.id, 
            date: formattedDate,
            amount: b.amount,
            user_id: b.user_id,
            household_id: _householdId ?? null
          })
          .select()
          .single()
          
        if (newPeriodError) console.error('Error creating new budget period:', newPeriodError)
        b.currentPeriod = newPeriod || null
      }
    }

    return budgets || []
  }

  // Returns distinct { year, month } pairs that exist in Budget_Period, sorted ascending.
  export async function getAvailableBudgetMonths(): Promise<{ year: number; month: number }[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('Budget_Hit')
      .select('date')
      .eq('type', 'Expense')
      .order('date', { ascending: true })
    if (error) throw error
    const seen = new Set<string>()
    const result: { year: number; month: number }[] = []
    for (const row of (data || [])) {
      const [yearStr, monthStr] = (row.date as string).split('-')
      const key = `${yearStr ?? ''}-${monthStr ?? ''}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push({ year: parseInt(yearStr ?? '0'), month: parseInt(monthStr ?? '0') })
      }
    }
    return result
  }

  // Returns only budgets that have a Budget_Period row for the given month.
  // For the current month, missing periods are auto-created (existing behaviour).
  // For any other month, only budgets with an existing period are returned.
  export async function getBudgetsByMonth(year: number, month: number) {
    const supabase = getSupabase()
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-01`

    const now = new Date()
    const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)

    // Fetch all budgets and all periods for this month in parallel
    const [{ data: allBudgets, error: budgetsError }, { data: periods, error: periodsError }] =
      await Promise.all([
        supabase.from('Budgets').select('*').order('created_at', { ascending: false }),
        supabase.from('Budget_Period').select('*').eq('date', formattedDate)
      ])

    if (budgetsError) throw budgetsError
    if (periodsError) throw periodsError

    const periodMap = new Map((periods || []).map((p: any) => [p.budget_id, p]))

    const result: any[] = []

    for (const b of (allBudgets || [])) {
      let period = periodMap.get(b.id) || null

      if (!period && isCurrentMonth) {
        // Auto-create the period for the current month only
        const { data: newPeriod, error: newPeriodError } = await supabase
          .from('Budget_Period')
          .insert({ budget_id: b.id, date: formattedDate, amount: b.amount, user_id: b.user_id, household_id: _householdId ?? null })
          .select()
          .single()
        if (newPeriodError) console.error('Error creating budget period:', newPeriodError)
        period = newPeriod || null
      }

      // Only include this budget if a period exists for the selected month
      if (period) {
        result.push({ ...b, currentPeriod: period })
      }
    }

    return result
  }

  export async function getBudgetById(id: string) {
    const supabase = getSupabase()
    const { data: budget, error } = await supabase
      .from('Budgets')
      .select('*')
      .eq('id', id)
      .single()


    const {data: budgetPeriods, error: periodError} = await supabase
      .from('Budget_Period')
      .select('*')  
      .eq('budget_id', id)

    if (periodError) throw periodError
    budget.currentPeriod = budgetPeriods?.[0] || null
    return budget
  } 

  export async function updateBudget(id: string, name: string, amount: string) {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('Budgets')
      .update({
        name,
        amount: parseFloat(amount)
      })
      .eq('id', id)
      .select()
      .single()

    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const currentMonthFirstDate = new Date(currentYear, currentMonth - 1, 1)
    const formattedDate = currentMonthFirstDate.toISOString().split('T')[0]

    const {data: periodData, error: periodError} = await supabase
      .from('Budget_Period')
      .update({
        amount: parseFloat(amount)
      })
      .eq('budget_id', id)
      .eq('date', formattedDate)
      .select()
      .single()

    if (periodError) throw periodError
    if (error) throw error
    return {data, periodData}
  }

  export async function deleteBudget(id: string) {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('Budgets')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

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
          household_id: _householdId ?? null,
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
        household_id: _householdId ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  export async function createBudgetHit(budgetId: string | null, date: string, amount: string, note: string, accountId: string | null = null) {
    const supabase = getSupabase()
    const { data: auth } = await supabase.auth.getSession()
    const householdId = await resolveHouseholdId()
    const parsedAmount = parseFloat(amount)
    const { data, error } = await supabase
      .from('Budget_Hit')
      .insert({
        budget_id: budgetId,
        date: date,
        amount: parsedAmount,
        note: note,
        type: 'Expense',
        account_id: accountId,
        user_id: auth.session?.user?.id,
        household_id: householdId
      })
      .select()
      .single()

    if (error) throw error

    return data
  }

  export async function getBudgetHits() {
    const supabase = getSupabase()
    const { data: hits, error } = await supabase
      .from('Budget_Hit')
      .select('*')
      .eq('type', 'Expense')
      .order('date', { ascending: false })

    if (error) throw error
    return hits || []
  }

  export async function getBudgetHitsByBudgetId(budgetId: string) {
    const supabase = getSupabase()
    const { data: hits, error } = await supabase
      .from('Budget_Hit')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('type', 'Expense')
      .order('date', { ascending: false })

    if (error) throw error
    return hits || []
  }

  export async function deleteBudgetHit(id: string) {
    const supabase = getSupabase()

    const { error } = await supabase
      .from('Budget_Hit')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  export async function updateBudgetHit(id: string, budgetId: string | null, date: string, amount: string, note: string, accountId: string | null = null) {
    const supabase = getSupabase()

    const parsedAmount = parseFloat(amount)
    const { data, error } = await supabase
      .from('Budget_Hit')
      .update({
        budget_id: budgetId,
        date: date,
        amount: parsedAmount,
        note: note,
        account_id: accountId,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return data
  }

  // --- Income ---

  export async function getIncome() {
    const supabase = getSupabase()
    const householdId = await resolveHouseholdId()
    const { data, error } = await supabase
      .from('Budget_Hit')
      .select('*')
      .eq('type', 'Income')
      .eq('household_id', householdId)
      .order('date', { ascending: false })

    if (error) throw error
    return data || []
  }

  export async function insertIncome(amount: number, date: string, note: string, accountId: string | null = null) {
    const supabase = getSupabase()
    const { data: auth } = await supabase.auth.getSession()
    const householdId = await resolveHouseholdId()
    const { data, error } = await supabase
      .from('Budget_Hit')
      .insert({
        amount,
        date,
        note,
        type: 'Income',
        budget_id: null,
        account_id: accountId,
        user_id: auth.session?.user?.id,
        household_id: householdId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  export async function deleteIncome(id: string) {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('Budget_Hit')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  export async function getBudgetHitsByMonth(year: number, month: number) {
    const supabase = getSupabase()
    const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate   = `${nextMonth.year}-${String(nextMonth.month).padStart(2, '0')}-01`
    const { data, error } = await supabase
      .from('Budget_Hit')
      .select('*')
      .eq('type', 'Expense')
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false })
    if (error) throw error
    return data || []
  }

  export async function getIncomeByMonth(year: number, month: number) {
    const supabase = getSupabase()
    const householdId = await resolveHouseholdId()
    const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate   = `${nextMonth.year}-${String(nextMonth.month).padStart(2, '0')}-01`
    const { data, error } = await supabase
      .from('Budget_Hit')
      .select('*')
      .eq('type', 'Income')
      .eq('household_id', householdId)
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false })
    if (error) throw error
    return data || []
  }

  // --- Accounts ---

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
