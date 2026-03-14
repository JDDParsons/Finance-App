import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse';

function getSupabase() {
    const config = useRuntimeConfig()

    return createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey
  )
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

  // Save a balance snapshot (used by the Snap page)
  export async function saveBalance(input: any) {
    const supabase = getSupabase()
    const payload = {
      bmo_chequing_1: input.bmoChequing1 ?? null,
      bmo_chequing_2: input.bmoChequing2 ?? null,
      bmo_mastercard: input.bmoMastercard ?? null,
      questrade_tfsa: input.questradeTfsa ?? null,
      questrade_rrsp: input.questradeRrsp ?? null,
      questrade_lrsp: input.questradeLrsp ?? null,
      questrade_fhsa: input.questradeFhsa ?? null,
      scotiabank_chequing: input.scotiabankChequing ?? null,
      scotiabank_savings: input.scotiabankSavings ?? null,
      scotiabank_visa: input.scotiabankVisa ?? null,
      pcfinancial_mastercard: input.pcMastercard ?? null,
      total: input.total ?? null
    }

    const { data, error } = await supabase
      .from('Balance')
      .insert(payload as any)
      .select()
      .single()

    if (error) throw error
    return data
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

    const data = parsed.map((it: any) => ({
      id: it.Id,
      group: it.Group,
      group_id: it.GroupId,
      amount: it.Amount,
      description: it.Description,
      transaction_date: new Date(it.TransactionDate),
      user_id: auth.session?.user?.id
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
    else window.location.href = '/'; 
  }

  export async function createBudget(name: string, amount: string) {
    const supabase = getSupabase()
    const { data: auth } = await supabase.auth.getSession(); 
    const { data, error } = await supabase
      .from('Budgets')
      .insert({
        name,
        amount: parseFloat(amount),
        user_id: auth.session?.user?.id
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
        user_id: auth.session?.user?.id
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
            user_id: b.user_id
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
      .from('Budget_Period')
      .select('date')
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
          .insert({ budget_id: b.id, date: formattedDate, amount: b.amount, user_id: b.user_id })
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

  export async function createBudgetHit(budgetId: string | null, date: string, amount: string, note: string) {
    const supabase = getSupabase()
    const { data: auth } = await supabase.auth.getSession()
    const { data, error } = await supabase
      .from('Budget_Hit')
      .insert({
        budget_id: budgetId,
        date: date,
        amount: parseFloat(amount),
        note: note,
        user_id: auth.session?.user?.id
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

  export async function updateBudgetHit(id: string, budgetId: string | null, date: string, amount: string, note: string) {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('Budget_Hit')
      .update({
        budget_id: budgetId,
        date: date,
        amount: parseFloat(amount),
        note: note,
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
    const { data: auth } = await supabase.auth.getSession()
    const { data, error } = await supabase
      .from('Income')
      .select('*')
      .eq('user_id', auth.session?.user?.id)
      .order('date', { ascending: false })

    if (error) throw error
    return data || []
  }

  export async function insertIncome(amount: number, date: string, note: string) {
    const supabase = getSupabase()
    const { data: auth } = await supabase.auth.getSession()
    const { data, error } = await supabase
      .from('Income')
      .insert({
        amount,
        date,
        note,
        user_id: auth.session?.user?.id
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  export async function deleteIncome(id: string) {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('Income')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  export async function getBudgetHitsByMonth(year: number, month: number) {
    const supabase = getSupabase()
    const startDate = new Date(year, month - 1, 1).toISOString()
    const endDate   = new Date(year, month,     1).toISOString()
    const { data, error } = await supabase
      .from('Budget_Hit')
      .select('*')
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false })
    if (error) throw error
    return data || []
  }

  export async function getIncomeByMonth(year: number, month: number) {
    const supabase = getSupabase()
    const { data: auth } = await supabase.auth.getSession()
    const startDate = new Date(year, month - 1, 1).toISOString()
    const endDate   = new Date(year, month,     1).toISOString()
    const { data, error } = await supabase
      .from('Income')
      .select('*')
      .eq('user_id', auth.session?.user?.id)
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false })
    if (error) throw error
    return data || []
  }
