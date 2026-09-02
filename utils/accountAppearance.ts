import { createError } from 'h3'

export const DEFAULT_ACCOUNT_COLOR = '#6366f1'
export const DEFAULT_ACCOUNT_ICON = 'heroicons-solid:building-library'
export const ACCOUNT_ICONS = [
  DEFAULT_ACCOUNT_ICON,
  'heroicons-solid:credit-card',
] as const

export type AccountIcon = typeof ACCOUNT_ICONS[number]

export function resolveAccountIcon(icon: unknown): AccountIcon {
  return ACCOUNT_ICONS.includes(icon as AccountIcon) ? icon as AccountIcon : DEFAULT_ACCOUNT_ICON
}

export function normalizeAccountIcon(icon: unknown): AccountIcon {
  if (typeof icon !== 'string' || !ACCOUNT_ICONS.includes(icon as AccountIcon)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid account icon.' })
  }
  return icon as AccountIcon
}
