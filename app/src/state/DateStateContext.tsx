import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'
import { addDays } from '@/lib/time'

type DateState = {
  today: Date
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  goToPreviousDay: () => void
  goToNextDay: () => void
}

const DateStateContext = createContext<DateState | undefined>(undefined)

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

export function useDateState() {
  const context = useContext(DateStateContext)
  if (!context) {
    throw new Error('useDateState must be used within a DateStateProvider')
  }
  return context
}
