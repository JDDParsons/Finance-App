export interface EntitySummary {
  /** Normalized form; look-alike spellings share one key. */
  key: string
  /** The spelling shown for the group. */
  name: string
  expenseCount: number
  incomeCount: number
  expenseTotal: number
  incomeTotal: number
}

export type EntitySort = 'name' | 'count' | 'total'

export const ENTITY_NAME_MAX_LENGTH = 100

/**
 * The same grouping the database uses (`finance-app.entity_key`): Unicode
 * normalized, whitespace collapsed and trimmed, lower case.
 */
export function normalizeEntityKey(name: string | null | undefined) {
  return (name ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
}

export function cleanEntityName(name: string | null | undefined) {
  return (name ?? '').replace(/\s+/g, ' ').trim()
}

export function entityRecordCount(entity: Pick<EntitySummary, 'expenseCount' | 'incomeCount'>) {
  return entity.expenseCount + entity.incomeCount
}

export function entityTotal(entity: Pick<EntitySummary, 'expenseTotal' | 'incomeTotal'>) {
  return entity.expenseTotal + entity.incomeTotal
}

/**
 * Groups expense and income rows into entities, like the database does. Used to
 * show the list offline from cached months. Rows are de-duplicated by id because
 * cached months can overlap.
 */
export function summarizeEntities(
  expenses: Array<Record<string, any>>,
  income: Array<Record<string, any>>
): EntitySummary[] {
  const groups = new Map<string, {
    summary: EntitySummary
    spellings: Map<string, { uses: number; latest: string }>
  }>()
  const seen = new Set<string>()

  function add(row: Record<string, any>, kind: 'expense' | 'income') {
    const name = cleanEntityName(row.entity)
    const key = normalizeEntityKey(name)
    if (!key) return
    const identity = `${kind}:${row.id ?? ''}`
    if (row.id && seen.has(identity)) return
    if (row.id) seen.add(identity)

    let group = groups.get(key)
    if (!group) {
      group = {
        summary: { key, name, expenseCount: 0, incomeCount: 0, expenseTotal: 0, incomeTotal: 0 },
        spellings: new Map(),
      }
      groups.set(key, group)
    }

    const amount = Number(row.amount) || 0
    if (kind === 'expense') {
      group.summary.expenseCount += 1
      group.summary.expenseTotal += amount
    } else {
      group.summary.incomeCount += 1
      group.summary.incomeTotal += amount
    }

    const spelling = group.spellings.get(name) ?? { uses: 0, latest: '' }
    spelling.uses += 1
    const date = String(row.date ?? '')
    if (date > spelling.latest) spelling.latest = date
    group.spellings.set(name, spelling)
  }

  expenses.forEach(row => add(row, 'expense'))
  income.forEach(row => add(row, 'income'))

  return [...groups.values()].map(({ summary, spellings }) => {
    // Show the most used spelling, then the most recent, then alphabetical.
    const best = [...spellings.entries()].sort(([nameA, a], [nameB, b]) =>
      b.uses - a.uses || b.latest.localeCompare(a.latest) || nameA.localeCompare(nameB)
    )[0]
    return { ...summary, name: best?.[0] ?? summary.name }
  })
}

/**
 * The payee or payer suggestions of each budget, most used first. Rows must be
 * newest first: entities used equally often keep that order, so the most
 * recently used comes first.
 */
export function rankEntitiesByBudget(rows: Array<{ budget_id?: string | null; entity?: string | null }>) {
  const usesByBudget = new Map<string, Map<string, number>>()

  for (const row of rows) {
    const budgetId = row.budget_id
    const entity = row.entity?.trim()
    if (!budgetId || !entity) continue

    const uses = usesByBudget.get(budgetId) ?? new Map<string, number>()
    uses.set(entity, (uses.get(entity) ?? 0) + 1)
    usesByBudget.set(budgetId, uses)
  }

  return new Map(
    [...usesByBudget].map(([budgetId, uses]) => [
      budgetId,
      [...uses].sort(([, a], [, b]) => b - a).map(([entity]) => entity),
    ])
  )
}

export function sortEntities(entities: EntitySummary[], sort: EntitySort) {
  const byName = (a: EntitySummary, b: EntitySummary) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.key.localeCompare(b.key)
  const sorted = [...entities]
  if (sort === 'count') return sorted.sort((a, b) => entityRecordCount(b) - entityRecordCount(a) || byName(a, b))
  if (sort === 'total') return sorted.sort((a, b) => entityTotal(b) - entityTotal(a) || byName(a, b))
  return sorted.sort(byName)
}

export function filterEntities(entities: EntitySummary[], query: string) {
  const needle = normalizeEntityKey(query)
  if (!needle) return entities
  return entities.filter(entity => entity.key.includes(needle))
}

export type RenamePlan =
  | { kind: 'invalid'; message: string }
  | { kind: 'unchanged' }
  | { kind: 'rename'; name: string; expenses: number; income: number }
  | { kind: 'merge'; name: string; into: EntitySummary; expenses: number; income: number }

/**
 * Decides what saving a typed name would do. A name that normalizes to another
 * entity is a merge, and uses that entity's spelling so the group stays
 * consistent. A change of case or spacing only is a normal rename.
 */
export function planRename(
  entities: EntitySummary[],
  source: EntitySummary,
  typedName: string
): RenamePlan {
  const name = cleanEntityName(typedName)
  if (!name) return { kind: 'invalid', message: 'Enter a name.' }
  if (name.length > ENTITY_NAME_MAX_LENGTH) {
    return { kind: 'invalid', message: `Use ${ENTITY_NAME_MAX_LENGTH} characters or fewer.` }
  }

  const targetKey = normalizeEntityKey(name)
  const other = targetKey === source.key ? undefined : entities.find(entity => entity.key === targetKey)
  if (other) {
    return { kind: 'merge', name: other.name, into: other, expenses: source.expenseCount, income: source.incomeCount }
  }
  if (name === source.name) return { kind: 'unchanged' }
  return { kind: 'rename', name, expenses: source.expenseCount, income: source.incomeCount }
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** "43 records (38 expenses, 5 income)" */
export function describeRecords(expenses: number, income: number) {
  const parts: string[] = []
  if (expenses) parts.push(plural(expenses, 'expense'))
  if (income) parts.push(`${income} income`)
  return `${plural(expenses + income, 'record')}${parts.length ? ` (${parts.join(', ')})` : ''}`
}

export function confirmationMessage(source: EntitySummary, plan: Extract<RenamePlan, { kind: 'rename' | 'merge' }>) {
  const records = describeRecords(plan.expenses, plan.income)
  if (plan.kind === 'merge') {
    return `Merge '${source.name}' into '${plan.name}'? This changes ${records}. This cannot be undone.`
  }
  return `Rename '${source.name}' to '${plan.name}'? This changes ${records}. This cannot be undone.`
}
