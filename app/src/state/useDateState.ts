import { useContext } from 'react'
import { DateStateContext } from './dateStateContextBase'

export function useDateState() {
  const context = useContext(DateStateContext)
  if (!context) {
    throw new Error('useDateState must be used within a DateStateProvider')
  }
  return context
}
