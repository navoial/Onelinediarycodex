import { type ReactNode, useMemo, useState } from 'react'
import { addDays } from '@/lib/time'
import { DateStateContext } from './dateStateContextBase'

export function DateStateProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => new Date(), [])
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  const value = useMemo(() => {
    return {
      today,
      selectedDate,
      setSelectedDate,
      goToPreviousDay: () => setSelectedDate((current) => addDays(current, -1)),
      goToNextDay: () => setSelectedDate((current) => addDays(current, 1)),
    }
  }, [selectedDate, today])

  return <DateStateContext.Provider value={value}>{children}</DateStateContext.Provider>
}
