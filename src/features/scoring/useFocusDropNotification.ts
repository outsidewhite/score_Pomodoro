import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  evaluateFocusDrop,
  initialFocusDropDetectionState,
  resetFocusDropTracking,
  type FocusDropDetectionState,
} from './focusDropDetection.ts'
import type { ScoreIntervalResult } from './intervalScoring.ts'

export const FOCUS_DROP_TOAST_ID = 'focus-drop'

const FOCUS_DROP_MESSAGE = '集中力が落ちてきているようです。休憩を検討しましょう'

export function useFocusDropNotification() {
  const stateRef = useRef<FocusDropDetectionState>(initialFocusDropDetectionState)

  const handleFocusStateChange = useCallback((isFocus: boolean) => {
    if (isFocus) return
    stateRef.current = resetFocusDropTracking()
  }, [])

  const handleIntervalComplete = useCallback((interval: ScoreIntervalResult) => {
    const evaluation = evaluateFocusDrop(stateRef.current, interval)
    stateRef.current = evaluation.state
    if (evaluation.shouldNotify) {
      toast.warning(FOCUS_DROP_MESSAGE, { id: FOCUS_DROP_TOAST_ID })
    }
  }, [])

  return { handleFocusStateChange, handleIntervalComplete }
}
