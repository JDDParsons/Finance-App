/** Morning runs from 5:00, afternoon from 12:00 and evening from 17:00 to 5:00. */
export function greetingFor(date: Date) {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Day is taken to be 6:00 to 18:00; sunrise and sunset are not looked up. */
export function isDaytime(date: Date) {
  const hour = date.getHours()
  return hour >= 6 && hour < 18
}

export function formatLongDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
