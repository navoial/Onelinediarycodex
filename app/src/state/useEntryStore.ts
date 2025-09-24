import { useContext, useEffect, useMemo } from 'react'
import { formatMonthShort, toISODateString } from '@/lib/time'
import { EntryStoreContext, type Entry, type QueueAction } from './entryStoreBase'

function deriveDaySummary(entry: Entry | null | undefined) {
  if (!entry) {
    return undefined
  }
  return {
    hasShort: Boolean(entry.one_liner?.trim().length),
    hasLong: Boolean(entry.long_text?.trim().length),
  }
}

export function useEntryStore() {
  const context = useContext(EntryStoreContext)
  if (!context) {
    throw new Error('useEntryStore must be used within EntryProvider')
  }
  return context
}

export function useMonthSummary(year: number, month: number) {
  const { summaries, ensureMonthSummary } = useEntryStore()
  useEffect(() => {
    void ensureMonthSummary(year, month)
  }, [ensureMonthSummary, year, month])
  const monthKey = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`
  return summaries[monthKey]
}

export function useEntryForDate(date: Date) {
  const isoDate = useMemo(() => toISODateString(date), [date])
  const { entries, ensureEntry } = useEntryStore()
  useEffect(() => {
    void ensureEntry(isoDate)
  }, [ensureEntry, isoDate])
  return entries[isoDate]
}

export function useEntryIndicators(dates: Date[]) {
  const { summaries, entries } = useEntryStore()
  return useMemo(() => {
    return dates.map((date) => {
      const iso = toISODateString(date)
      const monthKey = iso.slice(0, 7)
      const summary = summaries[monthKey]?.[iso]
      const fallback = deriveDaySummary(entries[iso]?.entry ?? null)
      return {
        iso,
        hasShort: summary?.hasShort ?? fallback?.hasShort ?? false,
        hasLong: summary?.hasLong ?? fallback?.hasLong ?? false,
      }
    })
  }, [dates, entries, summaries])
}

export function useEntryStatusMessage(isoDate: string) {
  const { entries } = useEntryStore()
  const record = entries[isoDate]
  if (!record) return undefined
  switch (record.status) {
    case 'saving':
      return 'Syncing…'
    case 'offline':
      return 'Saved offline — will sync later.'
    case 'synced':
      return record.aiFlagged ? 'Support resources shared' : 'Saved'
    case 'error':
      return record.error ?? 'Error'
    default:
      return undefined
  }
}

export function describeQueue(queue: QueueAction[]) {
  return `${queue.length} pending actions`
}

export function formatMonthLabel(date: Date) {
  return formatMonthShort(date)
}
