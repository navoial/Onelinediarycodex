import { useContext } from 'react'
import { ProfileContext } from './profileStoreBase'

export function usePlan() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('usePlan must be used within a ProfileProvider')
  }
  return context
}
