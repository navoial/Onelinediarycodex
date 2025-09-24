import { formatMonthShort, isSameDate } from '@/lib/time'
import { useDateState } from '@/state/DateStateContext'
import { type SVGProps, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import WeekStrip from './WeekStrip'
import styles from './AppHeader.module.css'

function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx={12} cy={8} r={4} />
      <path d="M4 20c0-4.4 3.6-6 8-6s8 1.6 8 6" />
    </svg>
  )
}

function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="15 6 9 12 15 18" />
    </svg>
  )
}

function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  )
}

export default function AppHeader() {
  const navigate = useNavigate()
  const { today, selectedDate, setSelectedDate, goToNextDay, goToPreviousDay } = useDateState()

  const monthYearLabel = useMemo(() => formatMonthShort(selectedDate), [selectedDate])
  const showTodayChip = !isSameDate(today, selectedDate)

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.leftGroup}>
          <button
            type="button"
            className={styles.monthButton}
            onClick={() => navigate('/calendar')}
            aria-label="Open calendar"
          >
            {monthYearLabel}
          </button>
          {showTodayChip ? (
            <button
              type="button"
              className={styles.todayButton}
              onClick={() => setSelectedDate(today)}
            >
              Today
            </button>
          ) : null}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => navigate('/settings')}
            aria-label="Account"
          >
            <UserIcon className={styles.iconGraphic} aria-hidden="true" focusable="false" />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={goToPreviousDay}
            aria-label="Previous day"
          >
            <ChevronLeftIcon className={styles.chevronIcon} aria-hidden="true" focusable="false" />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={goToNextDay}
            aria-label="Next day"
          >
            <ChevronRightIcon className={styles.chevronIcon} aria-hidden="true" focusable="false" />
          </button>
        </div>
      </div>
      <WeekStrip />
    </header>
  )
}
