export interface Tag {
  id: string
  /** Normalized, always starting with `#`. */
  name: string
  color: string
  /** Set on a tag made offline that the server has not seen yet. */
  pending?: boolean
}

export interface TagSummary extends Tag {
  expenseCount: number
}

export const MAX_TAGS_PER_EXPENSE = 3
export const TAG_NAME_MAX_LENGTH = 20

/** The colors a new tag is given, least used first. Same list as `finance-app.tag_palette`. */
export const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
]

// Invisible characters that would create look-alike duplicates.
const HIDDEN_CHARACTERS = /[\p{Cc}\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD]/u

export type TagNameResult = { ok: true; name: string } | { ok: false; message: string }

/**
 * The same normalization the database uses (`finance-app.tag_name`): Unicode
 * normalized, whitespace removed, a leading # removed, lower case, one # added.
 * "Dinner Party", "#dinnerparty" and "DINNERPARTY" are the same tag.
 */
export function normalizeTagName(raw: string | null | undefined): TagNameResult {
  const cleaned = (raw ?? '').normalize('NFKC').replace(/\s/gu, '').replace(/^#+/, '')
  if (HIDDEN_CHARACTERS.test(cleaned)) {
    return { ok: false, message: 'Tag names cannot contain hidden characters.' }
  }
  const lowered = cleaned.toLowerCase()
  if (!lowered) return { ok: false, message: 'Enter a tag name.' }
  if ([...lowered].length > TAG_NAME_MAX_LENGTH) {
    return { ok: false, message: `Tag names can be at most ${TAG_NAME_MAX_LENGTH} characters.` }
  }
  return { ok: true, name: `#${lowered}` }
}

export type TagListResult = { ok: true; names: string[] } | { ok: false; message: string }

/**
 * Normalizes a list of names for one expense: duplicates are dropped and the
 * list is limited to `MAX_TAGS_PER_EXPENSE`.
 */
export function normalizeTagList(raw: Array<string | null | undefined>): TagListResult {
  const names: string[] = []
  for (const value of raw) {
    const result = normalizeTagName(value)
    if (!result.ok) return result
    if (!names.includes(result.name)) names.push(result.name)
  }
  if (names.length > MAX_TAGS_PER_EXPENSE) {
    return { ok: false, message: `An expense can have at most ${MAX_TAGS_PER_EXPENSE} tags.` }
  }
  return { ok: true, names }
}

/** The palette color the fewest tags use, earliest in the palette on a tie. */
export function nextTagColor(existing: Array<Pick<Tag, 'color'>>) {
  const uses = (color: string) => existing.filter(tag => tag.color.toLowerCase() === color).length
  return [...TAG_COLORS]
    .map((color, position) => ({ color, position, count: uses(color) }))
    .sort((a, b) => a.count - b.count || a.position - b.position)[0]!.color
}

/** Tags that start with what was typed (after normalizing), for suggestions. */
export function suggestTags<T extends Pick<Tag, 'name'>>(tags: T[], typed: string, exclude: string[] = []): T[] {
  const needle = (typed ?? '').normalize('NFKC').replace(/\s/gu, '').replace(/^#+/, '').toLowerCase()
  return tags
    .filter(tag => !exclude.includes(tag.name))
    .filter(tag => !needle || tag.name.slice(1).includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Merges tag details returned by the server into a list, replacing a pending tag of the same name. */
export function mergeTags(existing: Tag[], incoming: Tag[]): Tag[] {
  const byName = new Map(existing.map(tag => [tag.name, tag]))
  for (const tag of incoming) byName.set(tag.name, { id: tag.id, name: tag.name, color: tag.color })
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Adds a pending tag for every name the list does not know yet. */
export function addPendingTags(existing: Tag[], names: string[]): Tag[] {
  const next = [...existing]
  for (const name of names) {
    if (next.some(tag => tag.name === name)) continue
    next.push({ id: `pending:${name}`, name, color: nextTagColor(next), pending: true })
  }
  return next.sort((a, b) => a.name.localeCompare(b.name))
}
