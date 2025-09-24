import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { get, set } from 'idb-keyval'
import { supabase } from '@/lib/supabase'
import { addMonths, formatMonthShort, toISODateString } from '@/lib/time'
import { requestFeedback } from '@/lib/ai'

const SELF_HARM_FALLBACK =
  'I’m really sorry that things feel heavy right now. If you’re in immediate danger, please contact local emergency services. You can call or text 988 in the US/Canada, or find worldwide helplines at https://www.opencounseling.com/suicide-hotlines.'

export type EntryRecordStatus = 'idle' | 'loading' | 'synced' | 'saving' | 'offline' | 'error'

export type AiStatus = 'idle' | 'loading' | 'delayed' | 'ready' | 'error' | 'flagged'

export type Entry = {
  id?: string
  entry_date: string
  one_liner: string
  long_text: string | null
  ai_feedback: string | null
  ai_feedback_generated_at: string | null
  updated_at?: string
  created_at?: string
}

export type EntryRecord = {
  entry: Entry | null
  status: EntryRecordStatus
  error?: string
  aiStatus: AiStatus
  aiError?: string
  aiFlagged: boolean
  aiParts?: {
    reflection: string
    microStep: string
    question: string
  }
}

type DaySummary = {
  hasShort: boolean
  hasLong: boolean
}

type MonthSummary = Record<string, DaySummary>

type QueueAction =
  | { id: string; isoDate: string; type: 'upsertOneLiner'; payload: { text: string; requestFeedback: boolean } }
  | { id: string; isoDate: string; type: 'saveLongText'; payload: { text: string } }

type EntryContextValue = {
  entries: Record<string, EntryRecord>
  summaries: Record<string, MonthSummary>
  ensureEntry: (isoDate: string) => Promise<void>
  ensureMonthSummary: (year: number, month: number) => Promise<void>
  upsertOneLiner: (isoDate: string, text: string, options?: { requestFeedback?: boolean }) => Promise<void>
  saveLongText: (isoDate: string, text: string) => Promise<void>
  flushQueue: () => Promise<void>
  pendingQueue: number
}

const EntryStoreContext = createContext<EntryContextValue | undefined>(undefined)

const ENTRIES_KEY = 'onelinediary.entries'
const SUMMARIES_KEY = 'onelinediary.summaries'
const QUEUE_KEY = 'onelinediary.queue'

let indexedDbBroken = false
let indexedDbErrorLogged = false

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

function deriveDaySummary(entry: Entry | null | undefined): DaySummary | undefined {
  if (!entry) return undefined
  return {
    hasShort: Boolean(entry.one_liner?.trim().length),
    hasLong: Boolean(entry.long_text?.trim().length),
  }
}

async function safeGet<T>(key: string, fallback: T): Promise<T> {
  if (indexedDbBroken) {
    return fallback
  }
  try {
    const value = await get<T>(key)
    if (value) {
      return value
    }
    return fallback
  } catch (error) {
    if (!indexedDbErrorLogged) {
      console.warn('Failed to load', key, error)
      indexedDbErrorLogged = true
    }
    if (error instanceof DOMException) {
      indexedDbBroken = true
    }
    return fallback
  }
}

async function safeSet<T>(key: string, value: T) {
  if (indexedDbBroken) return
  try {
    await set(key, value)
  } catch (error) {
    if (!indexedDbErrorLogged) {
      console.warn('Failed to persist', key, error)
      indexedDbErrorLogged = true
    }
    if (error instanceof DOMException) {
      indexedDbBroken = true
    }
  }
}

export function EntryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, EntryRecord>>({})
  const [summaries, setSummaries] = useState<Record<string, MonthSummary>>({})
  const [queue, setQueue] = useState<QueueAction[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const feedbackTokens = useRef(new Map<string, string>())
  const delayTimers = useRef(new Map<string, number>())
  const queueRetryTimer = useRef<number | null>(null)
  const queueRetryAttempts = useRef(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [storedEntries, storedSummaries, storedQueue] = await Promise.all([
        safeGet<Record<string, EntryRecord>>(ENTRIES_KEY, {}),
        safeGet<Record<string, MonthSummary>>(SUMMARIES_KEY, {}),
        safeGet<QueueAction[]>(QUEUE_KEY, []),
      ])
      if (cancelled) return

      const normalizedEntries = Object.fromEntries(
        Object.entries(storedEntries).map(([iso, record]) => {
          const aiStatus = record.aiStatus ?? (record.entry?.ai_feedback ? 'ready' : 'idle')
          const aiFlagged = record.aiFlagged ?? record.entry?.ai_feedback === SELF_HARM_FALLBACK
          return [iso, { ...record, aiStatus, aiFlagged } as EntryRecord]
        }),
      )

      setEntries((prev) => {
        if (Object.keys(normalizedEntries).length === 0) {
          return prev
        }
        if (Object.keys(prev).length === 0) {
          return normalizedEntries
        }
        // Merge stored entries without clobbering records added before hydration finished.
        return {
          ...normalizedEntries,
          ...prev,
        }
      })

      setSummaries((prev) => {
        if (Object.keys(storedSummaries).length === 0) {
          return prev
        }
        if (Object.keys(prev).length === 0) {
          return storedSummaries
        }
        const merged: Record<string, MonthSummary> = {}
        for (const [month, summary] of Object.entries(storedSummaries)) {
          merged[month] = { ...summary }
        }
        for (const [month, summary] of Object.entries(prev)) {
          merged[month] = { ...(merged[month] ?? {}), ...summary }
        }
        return merged
      })

      setQueue((prev) => {
        if (storedQueue.length === 0) {
          return prev
        }
        if (prev.length === 0) {
          return [...storedQueue]
        }
        const existing = new Set(prev.map((action) => action.id))
        const merged = [...prev]
        for (const action of storedQueue) {
          if (!existing.has(action.id)) {
            merged.push(action)
          }
        }
        return merged
      })

      setIsHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isHydrated) {
      void safeSet(ENTRIES_KEY, entries)
    }
  }, [entries, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      void safeSet(SUMMARIES_KEY, summaries)
    }
  }, [summaries, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      void safeSet(QUEUE_KEY, queue)
    }
  }, [queue, isHydrated])

  const updateDaySummary = useCallback((isoDate: string, entry: Entry | null) => {
    if (!entry) return
    const monthKey = isoDate.slice(0, 7)
    setSummaries((prev) => {
      const nextMonth = { ...(prev[monthKey] ?? {}) }
      const derived = deriveDaySummary(entry)
      if (derived) {
        nextMonth[isoDate] = derived
      }
      return { ...prev, [monthKey]: nextMonth }
    })
  }, [])

  const setRecord = useCallback(
    (isoDate: string, updater: (current: EntryRecord | undefined) => EntryRecord | undefined) => {
      setEntries((prev) => {
        const current = prev[isoDate]
        const next = updater(current)
        if (!next) {
          const { [isoDate]: _removed, ...rest } = prev
          return rest
        }
        if (current && current === next) {
          return prev
        }
        return { ...prev, [isoDate]: next }
      })
    },
    [],
  )

  const clearDelayTimer = useCallback((isoDate: string) => {
    const existing = delayTimers.current.get(isoDate)
    if (existing) {
      window.clearTimeout(existing)
      delayTimers.current.delete(isoDate)
    }
  }, [])
  const scheduleDelayTimer = useCallback(
    (isoDate: string) => {
      clearDelayTimer(isoDate)
      const timer = window.setTimeout(() => {
        setRecord(isoDate, (current) => {
          if (!current) return current
          if (current.aiStatus !== 'loading') return current
          return { ...current, aiStatus: 'delayed' }
        })
      }, 3000)
      delayTimers.current.set(isoDate, timer)
    },
    [clearDelayTimer, setRecord],
  )

  const startFeedbackRequest = useCallback(
    async (isoDate: string, entry: Entry | null) => {
      if (!entry?.id || !supabase) {
        return
      }

      const token = randomId()
      feedbackTokens.current.set(isoDate, token)

      setRecord(isoDate, (current) => {
        if (!current) return current
        return {
          ...current,
          aiStatus: 'loading',
          aiError: undefined,
          aiFlagged: false,
          aiParts: current.aiParts,
        }
      })

      scheduleDelayTimer(isoDate)

      try {
        const response = await requestFeedback(entry.id)
        if (feedbackTokens.current.get(isoDate) !== token) {
          return
        }
        clearDelayTimer(isoDate)
        if (!response) {
          setRecord(isoDate, (current) => {
            if (!current) return current
            return {
              ...current,
              aiStatus: current.entry?.ai_feedback ? 'ready' : 'idle',
              aiError: undefined,
              aiFlagged: current.aiFlagged,
              aiParts: current.aiParts,
            }
          })
          return
        }
        setRecord(isoDate, (current) => {
          if (!current) return current
          const nextEntry = current.entry
            ? {
                ...current.entry,
                ai_feedback: response.feedback,
                ai_feedback_generated_at: response.generatedAt ?? new Date().toISOString(),
              }
            : current.entry
          return {
            ...current,
            entry: nextEntry,
            aiStatus: response.flagged ? 'flagged' : 'ready',
            aiError: undefined,
            aiFlagged: response.flagged ?? false,
            aiParts: response.parts ?? (response.flagged ? undefined : current.aiParts),
          }
        })
      } catch (error) {
        if (feedbackTokens.current.get(isoDate) !== token) {
          return
        }
        clearDelayTimer(isoDate)
        setRecord(isoDate, (current) => {
          if (!current) return current
          return {
            ...current,
            aiStatus: 'error',
            aiError: error instanceof Error ? error.message : 'We could not load feedback right now.',
            aiFlagged: current.aiFlagged,
            aiParts: current.aiParts,
          }
        })
      }
    },
    [clearDelayTimer, scheduleDelayTimer, setRecord],
  )

  const ensureEntry = useCallback(
    async (isoDate: string) => {
      setRecord(isoDate, (current) => {
        if (current && current.status !== 'idle') {
          return current
        }
        return {
          entry: current?.entry ?? null,
          status: 'loading',
          error: undefined,
          aiStatus: current?.aiStatus ?? (current?.entry?.ai_feedback ? 'ready' : 'idle'),
          aiError: undefined,
          aiFlagged: current?.aiFlagged ?? (current?.entry?.ai_feedback === SELF_HARM_FALLBACK),
          aiParts: current?.aiParts,
        }
      })

      if (!supabase) {
        setRecord(isoDate, (current) => {
          if (!current) return current
          return {
            ...current,
            status: current.entry ? 'offline' : 'idle',
            error: current.entry ? undefined : 'Supabase client not configured',
            aiFlagged: current.aiFlagged,
            aiParts: current.aiParts,
          }
        })
        return
      }

      const { data, error } = await supabase
        .from('entries')
        .select('id, entry_date, one_liner, long_text, ai_feedback, ai_feedback_generated_at, updated_at, created_at')
        .eq('entry_date', isoDate)
        .maybeSingle()

      setRecord(isoDate, () => {
        const entry = data ?? null
        return {
          entry,
          status: error ? 'error' : entry ? 'synced' : 'idle',
          error: error?.message,
          aiStatus: entry?.ai_feedback ? 'ready' : 'idle',
          aiError: undefined,
          aiFlagged: entry?.ai_feedback === SELF_HARM_FALLBACK,
          aiParts: undefined,
        }
      })

      if (data) {
        updateDaySummary(isoDate, data)
      }
    },
    [updateDaySummary],
  )

  const ensureMonthSummary = useCallback(async (year: number, month: number) => {
    const monthKey = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`
    if (summaries[monthKey]) return

    if (!supabase) {
      return
    }

    const start = new Date(year, month - 1, 1)
    const end = addMonths(start, 1)
    end.setDate(0)

    const { data, error } = await supabase
      .from('entries')
      .select('entry_date, long_text')
      .gte('entry_date', toISODateString(start))
      .lte('entry_date', toISODateString(end))

    if (error) {
      console.warn('Month summary fetch failed', error)
      return
    }

    const next: MonthSummary = {}
    data.forEach((row) => {
      if (!row.entry_date) return
      next[row.entry_date] = {
        hasShort: true,
        hasLong: Boolean(row.long_text?.trim().length),
      }
    })

    setSummaries((prev) => ({ ...prev, [monthKey]: next }))
  }, [summaries])

  const queueAction = useCallback((action: QueueAction) => {
    setQueue((prev) => [...prev.filter((item) => item.id !== action.id), action])
  }, [])

  const flushQueue = useCallback(async () => {
    if (!supabase) return

    if (queueRetryTimer.current) {
      window.clearTimeout(queueRetryTimer.current)
      queueRetryTimer.current = null
    }

    if (queue.length === 0) {
      queueRetryAttempts.current = 0
      return
    }

    let didChange = false
    const nextQueue: QueueAction[] = []

    for (let index = 0; index < queue.length; index += 1) {
      const action = queue[index]
      try {
        if (action.type === 'upsertOneLiner') {
          const { data, error } = await supabase
            .from('entries')
            .upsert(
              { entry_date: action.isoDate, one_liner: action.payload.text },
              { onConflict: 'user_id,entry_date' },
            )
            .select()
            .single()

          if (error) {
            throw error
          }

          setRecord(action.isoDate, (current) => {
            const entry: Entry = data ?? {
              entry_date: action.isoDate,
              one_liner: action.payload.text,
              long_text: current?.entry?.long_text ?? null,
              ai_feedback: current?.entry?.ai_feedback ?? null,
              ai_feedback_generated_at: current?.entry?.ai_feedback_generated_at ?? null,
              id: data?.id ?? current?.entry?.id,
            }
            updateDaySummary(action.isoDate, entry)
            startFeedbackRequest(action.isoDate, action.payload.requestFeedback ? entry : null)
            return {
              entry,
              status: 'synced',
              error: undefined,
              aiStatus: action.payload.requestFeedback ? 'loading' : current?.aiStatus ?? 'idle',
              aiError: undefined,
              aiFlagged: action.payload.requestFeedback ? false : current?.aiFlagged ?? false,
              aiParts: action.payload.requestFeedback ? undefined : current?.aiParts,
            }
          })
          didChange = true
        } else if (action.type === 'saveLongText') {
          const { data, error } = await supabase
            .from('entries')
            .update({ long_text: action.payload.text })
            .eq('entry_date', action.isoDate)
            .select()
            .single()

          if (error) {
            throw error
          }

          setRecord(action.isoDate, (current) => {
            const entry: Entry = data ?? {
              ...(current?.entry ?? {
                entry_date: action.isoDate,
                one_liner: '',
                ai_feedback: null,
                ai_feedback_generated_at: null,
              }),
              long_text: action.payload.text,
            }
            updateDaySummary(action.isoDate, entry)
            return {
              entry,
              status: 'synced',
              error: undefined,
              aiStatus: current?.aiStatus ?? (entry.ai_feedback ? 'ready' : 'idle'),
              aiError: current?.aiError,
              aiFlagged: current?.aiFlagged ?? entry.ai_feedback === SELF_HARM_FALLBACK,
              aiParts: current?.aiParts,
            }
          })
          didChange = true
        }
      } catch (error) {
        console.warn('Queue flush failed', error)
        nextQueue.push(action, ...queue.slice(index + 1))
        break
      }
    }

    if (didChange || nextQueue.length !== queue.length) {
      setQueue(nextQueue)
    }

    if (nextQueue.length === 0) {
      queueRetryAttempts.current = 0
      return
    }

    queueRetryAttempts.current += 1
    const attempt = Math.min(queueRetryAttempts.current, 5)
    const delay = Math.min(30000, 1000 * 2 ** attempt)
    queueRetryTimer.current = window.setTimeout(() => {
      queueRetryTimer.current = null
      void flushQueue()
    }, delay)
  }, [queue, supabase, updateDaySummary])

  useEffect(() => {
    if (!isHydrated) return

    const handler = () => {
      void flushQueue()
    }

    window.addEventListener('online', handler)
    handler()
    return () => window.removeEventListener('online', handler)
  }, [flushQueue, isHydrated])

  useEffect(() => {
    if (!isHydrated) return
    if (!navigator.onLine) return
    void flushQueue()
  }, [flushQueue, isHydrated, queue])

  const upsertOneLiner = useCallback(
    async (isoDate: string, text: string, options?: { requestFeedback?: boolean }) => {
      setRecord(isoDate, (current) => {
        const entry: Entry = {
          entry_date: isoDate,
          one_liner: text,
          long_text: current?.entry?.long_text ?? null,
          ai_feedback: current?.entry?.ai_feedback ?? null,
          ai_feedback_generated_at: current?.entry?.ai_feedback_generated_at ?? null,
          id: current?.entry?.id,
        }
        updateDaySummary(isoDate, entry)
        return {
          entry,
          status: navigator.onLine ? 'saving' : 'offline',
          error: undefined,
          aiStatus: options?.requestFeedback ? 'loading' : current?.aiStatus ?? 'idle',
          aiError: undefined,
          aiFlagged: false,
          aiParts: options?.requestFeedback ? undefined : current?.aiParts,
        }
      })

      const action: QueueAction = {
        id: randomId(),
        isoDate,
        type: 'upsertOneLiner',
        payload: { text, requestFeedback: options?.requestFeedback ?? false },
      }

      if (!supabase || !navigator.onLine) {
        queueAction(action)
        return
      }

      const { data, error } = await supabase
        .from('entries')
        .upsert({ entry_date: isoDate, one_liner: text }, { onConflict: 'user_id,entry_date' })
        .select()
        .single()

      if (error) {
        queueAction(action)
        setRecord(isoDate, (current) => {
          if (!current) return current
          return {
            ...current,
            status: 'offline',
            error: error.message,
            aiFlagged: current.aiFlagged,
            aiParts: current.aiParts,
          }
        })
        return
      }

      setRecord(isoDate, (current) => {
        const entry = data ?? current?.entry ?? null
        updateDaySummary(isoDate, entry)
        if (options?.requestFeedback && entry) {
          void startFeedbackRequest(isoDate, entry)
        }
        const aiStatus = entry?.ai_feedback
          ? 'ready'
          : options?.requestFeedback
          ? 'loading'
          : current?.aiStatus ?? 'idle'
        return {
          entry,
          status: 'synced',
          error: undefined,
          aiStatus,
          aiError: undefined,
          aiFlagged: entry?.ai_feedback === SELF_HARM_FALLBACK,
          aiParts: entry?.ai_feedback
            ? current?.aiParts
            : options?.requestFeedback
            ? undefined
            : current?.aiParts,
        }
      })
    },
    [queueAction, startFeedbackRequest, updateDaySummary],
  )

  const saveLongText = useCallback(
    async (isoDate: string, text: string) => {
      setRecord(isoDate, (current) => {
        if (!current) return current
        const entry: Entry = {
          ...(current.entry ?? {
            entry_date: isoDate,
            one_liner: '',
            ai_feedback: null,
            ai_feedback_generated_at: null,
          }),
          long_text: text,
        }
        updateDaySummary(isoDate, entry)
        return {
          entry,
          status: navigator.onLine ? 'saving' : 'offline',
          error: undefined,
          aiStatus: current.aiStatus,
          aiError: current.aiError,
          aiFlagged: current.aiFlagged,
          aiParts: current.aiParts,
        }
      })

      const action: QueueAction = { id: randomId(), isoDate, type: 'saveLongText', payload: { text } }

      if (!supabase || !navigator.onLine) {
        queueAction(action)
        return
      }

      const { data, error } = await supabase
        .from('entries')
        .update({ long_text: text })
        .eq('entry_date', isoDate)
        .select()
        .single()

      if (error) {
        queueAction(action)
        setRecord(isoDate, (current) => {
          if (!current) return current
          return {
            ...current,
            status: 'offline',
            error: error.message,
            aiFlagged: current.aiFlagged,
            aiParts: current.aiParts,
          }
        })
        return
      }

      setRecord(isoDate, (current) => {
        const entry = data ?? current?.entry ?? null
        updateDaySummary(isoDate, entry)
        return {
          entry,
          status: 'synced',
          error: undefined,
          aiStatus: current?.aiStatus ?? (entry?.ai_feedback ? 'ready' : 'idle'),
          aiError: current?.aiError,
          aiFlagged: current?.aiFlagged ?? entry?.ai_feedback === SELF_HARM_FALLBACK,
          aiParts: current?.aiParts,
        }
      })
    },
    [queueAction, updateDaySummary],
  )

  const value = useMemo<EntryContextValue>(
    () => ({
      entries,
      summaries,
      ensureEntry,
      ensureMonthSummary,
      upsertOneLiner,
      saveLongText,
      flushQueue,
      pendingQueue: queue.length,
    }),
    [entries, summaries, ensureEntry, ensureMonthSummary, upsertOneLiner, saveLongText, flushQueue, queue.length],
  )

  return <EntryStoreContext.Provider value={value}>{children}</EntryStoreContext.Provider>
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
