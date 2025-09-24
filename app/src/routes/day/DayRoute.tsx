import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import AIInsightCard from '@/components/AIInsightCard'
import { countGraphemes, truncateGraphemes } from '@/lib/graphemes'
import { toISODateString } from '@/lib/time'
import { useDateState } from '@/state/useDateState'
import { useEntryForDate, useEntryStatusMessage, useEntryStore } from '@/state/useEntryStore'
import { usePlan } from '@/state/usePlan'
import { useNavigate } from 'react-router-dom'
import styles from './DayRoute.module.css'

const ONE_LINER_LIMIT = 220

export default function DayRoute() {
  const { selectedDate } = useDateState()
  const isoDate = useMemo(() => toISODateString(selectedDate), [selectedDate])
  const record = useEntryForDate(selectedDate)
  const { upsertOneLiner, saveLongText } = useEntryStore()
  const { plan } = usePlan()
  const navigate = useNavigate()
  const entry = record?.entry
  const statusMessage = useEntryStatusMessage(isoDate)

  const [isEditingShort, setIsEditingShort] = useState(true)
  const [shortDraft, setShortDraft] = useState('')

  const previousOneLiner = useRef<string | undefined>(undefined)
  useEffect(() => {
    const current = entry?.one_liner ?? undefined
    if (current === previousOneLiner.current) {
      return
    }
    previousOneLiner.current = current
    if (current) {
      setIsEditingShort(false)
      setShortDraft(current)
    } else {
      setIsEditingShort(true)
      setShortDraft('')
    }
  }, [entry?.one_liner])

  const [isEditingExtra, setIsEditingExtra] = useState(false)
  const [extraDraft, setExtraDraft] = useState('')
  const previousLongText = useRef<string | undefined>(undefined)

  useEffect(() => {
    const current = entry?.long_text ?? undefined
    if (current === previousLongText.current) {
      return
    }
    previousLongText.current = current
    setExtraDraft(current ?? '')
  }, [entry?.long_text])

  const graphemeCount = useMemo(() => countGraphemes(shortDraft), [shortDraft])
  const counter = `${graphemeCount}/${ONE_LINER_LIMIT}`
  const isOverLimit = graphemeCount > ONE_LINER_LIMIT

  const canUsePremiumFeatures = plan.canRequestFeedback
  const canUseLongForm = plan.canUseLongForm

  useEffect(() => {
    if (!canUseLongForm) {
      setIsEditingExtra(false)
    }
  }, [canUseLongForm])

  function goToPaywall() {
    navigate('/paywall')
  }

  async function handleSubmitShort(event: FormEvent) {
    event.preventDefault()
    const trimmed = shortDraft.trim()
    if (!trimmed) return
    const text = truncateGraphemes(trimmed, ONE_LINER_LIMIT)
    await upsertOneLiner(isoDate, text, { requestFeedback: canUsePremiumFeatures })
    setIsEditingShort(false)
  }

  async function handleSaveExtra(event: FormEvent) {
    event.preventDefault()
    await saveLongText(isoDate, extraDraft.trim())
    setIsEditingExtra(false)
  }

  const showForm = isEditingShort || !entry?.one_liner
  const aiStatus = record?.aiStatus ?? (entry?.ai_feedback ? 'ready' : 'idle')

  return (
    <div className={styles.container}>
      {showForm ? (
        <form className={styles.promptSection} onSubmit={handleSubmitShort}>
          <h1 className={styles.promptTitle}>How was your day today?</h1>
          <textarea
            className={styles.textarea}
            placeholder="Write here..."
            value={shortDraft}
            onChange={(event) => setShortDraft(event.target.value)}
          />
          <div className={styles.counterRow}>
            <span>One sentence, up to 220 characters.</span>
            <span style={isOverLimit ? { color: '#c0362c' } : undefined}>{counter}</span>
          </div>
          <button type="submit" className={styles.primaryButton} disabled={!shortDraft.trim() || isOverLimit}>
            Save
          </button>
          {statusMessage ? <span className={styles.statusMessage}>{statusMessage}</span> : null}
        </form>
      ) : (
        <section className={styles.aiSection}>
          <h1 className={styles.entryTitle}>{entry?.one_liner}</h1>
          <div className={styles.toolbar}>
            <button type="button" className={styles.editButton} onClick={() => setIsEditingShort(true)}>
              Edit
            </button>
            {statusMessage ? <span className={styles.statusMessage}>{statusMessage}</span> : null}
          </div>
          {canUsePremiumFeatures ? (
            <AIInsightCard
              status={aiStatus}
              feedback={entry?.ai_feedback ?? undefined}
              fallbackMessage={record?.aiError}
              flagged={record?.aiFlagged}
              parts={record?.aiParts}
            />
          ) : null}
          {entry?.long_text ? (
            <div className={styles.extraSection}>
              <h2>Extra</h2>
              <div className={styles.extraCard}>{entry.long_text}</div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  if (!canUseLongForm) {
                    goToPaywall()
                    return
                  }
                  setIsEditingExtra(true)
                }}
              >
                {canUseLongForm ? 'Edit Extra' : 'Upgrade to edit'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                if (!canUseLongForm) {
                  goToPaywall()
                  return
                }
                setIsEditingExtra(true)
              }}
            >
              Add Entry
            </button>
          )}
          {isEditingExtra && canUseLongForm ? (
            <form className={styles.promptSection} onSubmit={handleSaveExtra}>
              <textarea
                className={styles.textarea}
                placeholder="Add more about your day..."
                value={extraDraft}
                onChange={(event) => setExtraDraft(event.target.value)}
              />
              <button type="submit" className={styles.primaryButton}>
                Save Extra
              </button>
            </form>
          ) : null}
        </section>
      )}
    </div>
  )
}
