type CameraStreamMonitorOptions = {
  muteGraceMs?: number
  onDisconnect: () => void
  stream: MediaStream
}

// 一時的な映像停止でタイマーを止めないよう、短い復帰猶予を設ける。
export const CAMERA_MUTE_GRACE_MS = 3_000

/**
 * カメラストリームの切断を監視し、監視を解除する関数を返す。
 *
 * 自分で `track.stop()` を呼んだ場合に`ended`は発火しないため、画面遷移や計測終了の
 * 停止処理を切断として扱うことはない。また`getUserMedia({ video: true })`のストリームは
 * 映像トラックだけを持つため、`ended`と同時に発火する`inactive`は監視せず、通知が
 * 二重に走らないようにする。
 */
export function watchCameraStream({
  muteGraceMs = CAMERA_MUTE_GRACE_MS,
  onDisconnect,
  stream,
}: CameraStreamMonitorOptions) {
  const tracks = stream.getTracks()
  const muteTimers = new Map<MediaStreamTrack, number>()
  let notified = false

  const stopWatching = () => {
    tracks.forEach((track) => track.removeEventListener('ended', handleEnded))
    tracks.forEach((track) => track.removeEventListener('mute', handleMute))
    tracks.forEach((track) => track.removeEventListener('unmute', handleUnmute))
    muteTimers.forEach((timerId) => window.clearTimeout(timerId))
    muteTimers.clear()
  }

  function notifyDisconnect() {
    // 複数トラックが同時に終了しても、切断処理は1回だけ実行する。
    if (notified) return
    notified = true
    stopWatching()
    onDisconnect()
  }

  function handleEnded() {
    notifyDisconnect()
  }

  function handleMute(event: Event) {
    const track = event.currentTarget as MediaStreamTrack
    if (notified || muteTimers.has(track)) return

    const timerId = window.setTimeout(() => {
      muteTimers.delete(track)
      notifyDisconnect()
    }, muteGraceMs)
    muteTimers.set(track, timerId)
  }

  function handleUnmute(event: Event) {
    const track = event.currentTarget as MediaStreamTrack
    const timerId = muteTimers.get(track)
    if (timerId === undefined) return
    window.clearTimeout(timerId)
    muteTimers.delete(track)
  }

  tracks.forEach((track) => {
    track.addEventListener('ended', handleEnded)
    track.addEventListener('mute', handleMute)
    track.addEventListener('unmute', handleUnmute)
  })

  // 終了済みのストリームを渡された場合は、再利用せずその場で切断として扱う。
  if (tracks.length === 0 || tracks.every(({ readyState }) => readyState === 'ended')) {
    notifyDisconnect()
  }

  return stopWatching
}
