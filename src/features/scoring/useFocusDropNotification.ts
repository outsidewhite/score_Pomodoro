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
    toast.dismiss(FOCUS_DROP_TOAST_ID)
  }, [])

  const handleIntervalComplete = useCallback((interval: ScoreIntervalResult) => {
    const evaluation = evaluateFocusDrop(stateRef.current, interval)
    stateRef.current = evaluation.state
    if (evaluation.shouldNotify) {
      // info通知はAppToasterのrichColors設定により青色で表示される。
      toast.info(FOCUS_DROP_MESSAGE, {
        action: {
          label: '休憩する',
          onClick: () => onBreakRequest(),
        },
        id: FOCUS_DROP_TOAST_ID,
      })
    }
  }, [onBreakRequest])

  return { handleFocusStateChange, handleIntervalComplete }
}
