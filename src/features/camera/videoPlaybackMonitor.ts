type VideoPlaybackMonitorOptions = {
  checkIntervalMs?: number
  freezeTimeoutMs?: number
  onFreeze: () => void
  video: Pick<HTMLVideoElement, 'currentTime' | 'ended' | 'paused' | 'readyState'>
}

export const VIDEO_FREEZE_TIMEOUT_MS = 5_000
export const VIDEO_PLAYBACK_CHECK_INTERVAL_MS = 500

// 再生可能な映像のcurrentTimeが一定時間進まない場合だけ、フリーズとして通知する。
export function watchVideoPlayback({
  checkIntervalMs = VIDEO_PLAYBACK_CHECK_INTERVAL_MS,
  freezeTimeoutMs = VIDEO_FREEZE_TIMEOUT_MS,
  onFreeze,
  video,
}: VideoPlaybackMonitorOptions) {
  const isPlayable = () =>
    !video.paused &&
    !video.ended &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA

  let lastVideoTime = video.currentTime
  let lastProgressAt = Date.now()
  let wasPlayable = isPlayable()
  let notified = false

  const timerId = window.setInterval(() => {
    if (notified) return

    const now = Date.now()
    if (!isPlayable()) {
      // 読み込み中や意図的な停止中は監視時間へ含めない。
      wasPlayable = false
      lastVideoTime = video.currentTime
      lastProgressAt = now
      return
    }

    if (!wasPlayable || Math.abs(video.currentTime - lastVideoTime) > 0.001) {
      wasPlayable = true
      lastVideoTime = video.currentTime
      lastProgressAt = now
      return
    }

    if (now - lastProgressAt < freezeTimeoutMs) return
    notified = true
    window.clearInterval(timerId)
    onFreeze()
  }, checkIntervalMs)

  return () => window.clearInterval(timerId)
}
