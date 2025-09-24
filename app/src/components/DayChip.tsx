import clsx from 'clsx'
import { formatDayNumber, formatWeekday } from '@/lib/time'
import styles from './DayChip.module.css'

type Props = {
  date: Date
  isSelected: boolean
  isToday: boolean
  hasShort?: boolean
  hasLong?: boolean
  disabled?: boolean
  onSelect: (date: Date) => void
}

export default function DayChip({
  date,
  isSelected,
  isToday,
  hasShort = false,
  hasLong = false,
  disabled = false,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      className={clsx(
        styles.button,
        isSelected && styles.selected,
        isToday && styles.today,
        hasShort && styles.hasShort,
        hasLong && styles.hasLong,
      )}
      onClick={() => onSelect(date)}
      disabled={disabled}
      aria-label={`${formatWeekday(date)}, ${formatDayNumber(date)}`}
    >
      <span className={styles.weekday}>{formatWeekday(date)}</span>
      <span className={styles.day}>{formatDayNumber(date)}</span>
      <span className={styles.marker} aria-hidden />
    </button>
  )
}
