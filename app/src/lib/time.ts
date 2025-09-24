export function toISODateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function isSameDate(a: Date, b: Date) {
  return toISODateString(a) === toISODateString(b)
}

export function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function formatMonthYear(date: Date, locale = navigator.language) {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatMonthShort(date: Date, locale = navigator.language) {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatWeekday(date: Date, locale = navigator.language) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
  }).format(date)
}

export function formatDayNumber(date: Date) {
  return date.getDate().toString()
}

export function getWeekRangeContaining(date: Date) {
  const day = date.getDay()
  const mondayIndex = (day + 6) % 7
  const start = addDays(date, -mondayIndex)
  const dates: Date[] = []
  for (let i = 0; i < 7; i += 1) {
    dates.push(addDays(start, i))
  }
  return dates
}
