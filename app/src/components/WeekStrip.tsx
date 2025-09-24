import { useEffect, useMemo } from 'react'
import { getFeatureFlag } from '@/featureFlags'
import { getWeekRangeContaining, isSameDate, toISODateString } from '@/lib/time'
import { useDateState } from '@/state/useDateState'
import { useEntryIndicators, useEntryStore } from '@/state/useEntryStore'
import DayChip from './DayChip'
import styles from './WeekStrip.module.css'

export default function WeekStrip() {
  const { today, selectedDate, setSelectedDate } = useDateState()
  const { ensureMonthSummary } = useEntryStore()

  const weekDates = useMemo(() => getWeekRangeContaining(selectedDate), [selectedDate])
  const allowFuture = getFeatureFlag('allowFutureEntries')

  useEffect(() => {
    const seen = new Set<string>()
    weekDates.forEach((date) => {
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`
      if (seen.has(key)) return
      seen.add(key)
      void ensureMonthSummary(date.getFullYear(), date.getMonth() + 1)
    })
  }, [ensureMonthSummary, weekDates])

  const indicators = useEntryIndicators(weekDates)

  return (
    <div className={styles.container}>
      <div className={styles.days}>
        {weekDates.map((date, index) => {
          const iso = toISODateString(date)
          const marker = indicators[index]
          const isDisabled = !allowFuture && date > today
          return (
            <DayChip
              key={iso}
              date={date}
              isSelected={isSameDate(date, selectedDate)}
              isToday={isSameDate(date, today)}
              hasShort={marker?.hasShort}
              hasLong={marker?.hasLong}
              disabled={isDisabled}
              onSelect={setSelectedDate}
            />
          )
        })}
      </div>
    </div>
  )
}
