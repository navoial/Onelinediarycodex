import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFeatureFlag } from '@/featureFlags'
import {
  endOfMonth,
  formatDayNumber,
  formatWeekday,
  isSameDate,
  toISODateString,
} from '@/lib/time'
import { useDateState } from '@/state/DateStateContext'
import { useMonthSummary } from '@/state/EntryStore'
import styles from './CalendarRoute.module.css'

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export default function CalendarRoute() {
  const navigate = useNavigate()
  const { selectedDate, today, setSelectedDate } = useDateState()
  const allowFuture = getFeatureFlag('allowFutureEntries')
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const skipSyncRef = useRef(false)
  const monthSectionRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const selectedYear = selectedDate.getFullYear()
    if (!skipSyncRef.current && selectedYear !== viewYear) {
      setViewYear(selectedYear)
    }
    skipSyncRef.current = false
  }, [selectedDate, viewYear])

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const start = new Date(viewYear, monthIndex, 1)
      const end = endOfMonth(start)
      const startOffset = WEEKDAY_ORDER.indexOf(start.getDay())
      const days: Array<Date | null> = []
      for (let i = 0; i < startOffset; i += 1) {
        days.push(null)
      }
      for (let day = 1; day <= end.getDate(); day += 1) {
        days.push(new Date(viewYear, monthIndex, day))
      }
      return {
        anchor: start,
        monthIndex,
        days,
      }
    })
  }, [viewYear])

  const monthSummaries = [
    useMonthSummary(viewYear, 1),
    useMonthSummary(viewYear, 2),
    useMonthSummary(viewYear, 3),
    useMonthSummary(viewYear, 4),
    useMonthSummary(viewYear, 5),
    useMonthSummary(viewYear, 6),
    useMonthSummary(viewYear, 7),
    useMonthSummary(viewYear, 8),
    useMonthSummary(viewYear, 9),
    useMonthSummary(viewYear, 10),
    useMonthSummary(viewYear, 11),
    useMonthSummary(viewYear, 12),
  ]

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
    skipSyncRef.current = true
    setViewYear(date.getFullYear())
    setSelectedDate(date)
    navigate('/')
  }

  function goToPreviousYear() {
    skipSyncRef.current = true
    setViewYear((prev) => prev - 1)
  }

  function goToNextYear() {
    skipSyncRef.current = true
    setViewYear((prev) => prev + 1)
  }

  const selectedMonthIndex = selectedDate.getFullYear() === viewYear ? selectedDate.getMonth() : null

  useEffect(() => {
    const targetIndex = selectedMonthIndex ?? 0
    const node = monthSectionRefs.current[targetIndex]
    if (node) {
      node.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
  }, [viewYear, selectedMonthIndex])

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.navButton}
          onClick={goToPreviousYear}
          aria-label="Previous year"
        >
          <span aria-hidden="true">&larr;</span>
        </button>
        <h2 className={styles.controlsTitle}>{viewYear}</h2>
        <button
          type="button"
          className={styles.navButton}
          onClick={goToNextYear}
          aria-label="Next year"
        >
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
      {months.map(({ anchor, monthIndex, days }) => {
        const summary = monthSummaries[monthIndex]
        const monthLabel = new Intl.DateTimeFormat(navigator.language, {
          month: 'long',
        }).format(anchor)
        const monthTitleClassName = selectedMonthIndex === monthIndex ? styles.monthTitleActive : styles.monthTitle
        return (
          <section
            key={anchor.toISOString()}
            className={styles.monthSection}
            ref={(node) => {
              monthSectionRefs.current[monthIndex] = node
            }}
          >
            <div className={styles.monthHeader}>
              <h2 className={monthTitleClassName}>{monthLabel}</h2>
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
