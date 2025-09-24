import { createContext } from 'react'

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

export type QueueAction =
  | { id: string; isoDate: string; type: 'upsertOneLiner'; payload: { text: string; requestFeedback: boolean } }
  | { id: string; isoDate: string; type: 'saveLongText'; payload: { text: string } }

export type EntryContextValue = {
  entries: Record<string, EntryRecord>
  summaries: Record<string, MonthSummary>
  ensureEntry: (isoDate: string) => Promise<void>
  ensureMonthSummary: (year: number, month: number) => Promise<void>
  upsertOneLiner: (isoDate: string, text: string, options?: { requestFeedback?: boolean }) => Promise<void>
  saveLongText: (isoDate: string, text: string) => Promise<void>
  flushQueue: () => Promise<void>
  pendingQueue: number
}

export const EntryStoreContext = createContext<EntryContextValue | undefined>(undefined)
export type { DaySummary, MonthSummary }
