import { createContext } from 'react'

export type DateState = {
  today: Date
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  goToPreviousDay: () => void
  goToNextDay: () => void
}

export const DateStateContext = createContext<DateState | undefined>(undefined)
