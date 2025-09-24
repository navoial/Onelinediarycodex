import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFeatureFlag } from '@/featureFlags'
import {
  addMonths,
  endOfMonth,
  formatDayNumber,
  formatMonthYear,
  formatWeekday,
  isSameDate,
  startOfMonth,
  toISODateString,
} from '@/lib/time'
import { useDateState } from '@/state/DateStateContext'
import { useMonthSummary } from '@/state/EntryStore'
import styles from './CalendarRoute.module.css'

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export default function CalendarRoute() {
  const navigate = useNavigate()
  const { selectedDate, today, setSelectedDate } = useDateState()
  const allowFuture = getFeatureFlag('allowFutureEntries')
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate))

  const nextMonthDate = useMemo(() => startOfMonth(addMonths(viewMonth, 1)), [viewMonth])
  const currentSummary = useMonthSummary(viewMonth.getFullYear(), viewMonth.getMonth() + 1)
  const nextSummary = useMonthSummary(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1)

  const months = useMemo(() => {
    return [viewMonth, nextMonthDate].map((anchor) => {
      const start = startOfMonth(anchor)
      const end = endOfMonth(anchor)
      const startOffset = WEEKDAY_ORDER.indexOf(start.getDay())
      const days: Array<Date | null> = []
      for (let i = 0; i < startOffset; i += 1) {
        days.push(null)
      }
      for (let day = 1; day <= end.getDate(); day += 1) {
        days.push(new Date(anchor.getFullYear(), anchor.getMonth(), day))
      }
      return {
        anchor: start,
        days,
      }
    })
  }, [nextMonthDate, viewMonth])

  const weekdayLabels = useMemo(() => {
    return WEEKDAY_ORDER.map((weekdayIndex) => {
      const baseDate = new Date(2020, 5, 1 + weekdayIndex)
      return formatWeekday(baseDate)
    })
  }, [])

  function handleSelect(date: Date) {
    if (!allowFuture && date > today) {
      return
    }
    setSelectedDate(date)
    navigate('/')
  }

  function goToPreviousMonth() {
    setViewMonth((prev) => startOfMonth(addMonths(prev, -1)))
  }

  function goToNextMonth() {
    setViewMonth((prev) => startOfMonth(addMonths(prev, 1)))
  }

  return (
    <div className={styles.container}>
      {months.map(({ anchor, days }, index) => {
        const summary = isSameMonth(anchor, viewMonth) ? currentSummary : nextSummary
        const monthLabel = formatMonthYear(anchor)
        return (
          <section key={anchor.toISOString()} className={styles.monthSection}>
            <div className={styles.monthHeader}>
              {index === 0 ? (
                <>
                  <button
                    type="button"
                    className={styles.navButton}
                    onClick={goToPreviousMonth}
                    aria-label="Previous month"
                  >
                    <span aria-hidden="true">&larr;</span>
                  </button>
                  <h2 className={styles.monthTitle}>{monthLabel}</h2>
                  <button
                    type="button"
                    className={styles.navButton}
                    onClick={goToNextMonth}
                    aria-label="Next month"
                  >
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                </>
              ) : (
                <>
                  <span className={styles.navButtonPlaceholder} />
                  <h2 className={styles.monthTitle}>{monthLabel}</h2>
                  <span className={styles.navButtonPlaceholder} />
                </>
              )}
            </div>
            <div className={styles.weekdayRow}>
              {weekdayLabels.map((label) => (
                <span key={`${anchor.toISOString()}-${label}`} className={styles.weekday}>
                  {label}
                </span>
              ))}
            </div>
            <div className={styles.grid}>
              {days.map((day, index) => {
                if (!day) {
                  return <span key={`placeholder-${anchor.toISOString()}-${index}`} />
                }
                const isToday = isSameDate(day, today)
                const isSelected = isSameDate(day, selectedDate)
                const classNames = [styles.dayCell]
                if (isToday) classNames.push(styles.today)
                if (isSelected) classNames.push(styles.selected)
                const iso = toISODateString(day)
                const indicator = summary?.[iso]
                if (indicator?.hasShort) classNames.push(styles.hasEntry)
                if (indicator?.hasLong) classNames.push(styles.hasLong)
                return (
                  <button
                    type="button"
                    key={day.toISOString()}
                    className={classNames.join(' ')}
                    onClick={() => handleSelect(day)}
                    disabled={!allowFuture && day > today}
                  >
                    {formatDayNumber(day)}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
