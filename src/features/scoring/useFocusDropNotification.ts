import { useCallback, useRef } from 'react'
import {
  dismissFocusDropNotification,
  showFocusDropNotification,
} from '../../components/Notification/AppToaster.tsx'
import {
  evaluateFocusDrop,
  initialFocusDropDetectionState,
  resetFocusDropTracking,
  type FocusDropDetectionState,
} from './focusDropDetection.ts'
import type { ScoreIntervalResult } from './intervalScoring.ts'

type UseFocusDropNotificationOptions = {
  onBreakRequest: () => void
}

export function useFocusDropNotification({
  onBreakRequest,
}: UseFocusDropNotificationOptions) {
  const stateRef = useRef<FocusDropDetectionState>(initialFocusDropDetectionState)

  const handleFocusStateChange = useCallback((isFocus: boolean) => {
    if (isFocus) return
    stateRef.current = resetFocusDropTracking()
    dismissFocusDropNotification()
  }, [])

  const handleIntervalComplete = useCallback((interval: ScoreIntervalResult) => {
    const evaluation = evaluateFocusDrop(stateRef.current, interval)
    stateRef.current = evaluation.state
    if (evaluation.shouldNotify) {
      showFocusDropNotification(onBreakRequest)
    }
  }, [onBreakRequest])

  return { handleFocusStateChange, handleIntervalComplete }
}
