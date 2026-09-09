type CameraStreamMonitorOptions = {
  onDisconnect: () => void
  stream: MediaStream
}

/**
 * カメラストリームの切断を監視し、監視を解除する関数を返す。
 *
 * 自分で `track.stop()` を呼んだ場合に`ended`は発火しないため、画面遷移や計測終了の
 * 停止処理を切断として扱うことはない。また`getUserMedia({ video: true })`のストリームは
 * 映像トラックだけを持つため、`ended`と同時に発火する`inactive`は監視せず、通知が
 * 二重に走らないようにする。
 */
export function watchCameraStream({
  onDisconnect,
  stream,
}: CameraStreamMonitorOptions) {
  const tracks = stream.getTracks()
  let notified = false

  const stopWatching = () => {
    tracks.forEach((track) => track.removeEventListener('ended', handleEnded))
  }

  function handleEnded() {
    // 複数トラックが同時に終了しても、切断処理は1回だけ実行する。
    if (notified) return
    notified = true
    stopWatching()
    onDisconnect()
  }

  tracks.forEach((track) => track.addEventListener('ended', handleEnded))

  // 終了済みのストリームを渡された場合は、再利用せずその場で切断として扱う。
  if (tracks.length === 0 || tracks.every(({ readyState }) => readyState === 'ended')) {
    handleEnded()
  }

  return stopWatching
}
