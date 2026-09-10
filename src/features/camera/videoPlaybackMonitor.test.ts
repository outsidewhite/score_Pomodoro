import { afterEach, describe, expect, test, vi } from 'vitest'
import { watchVideoPlayback } from './videoPlaybackMonitor.ts'

type FakeVideo = {
  currentTime: number
  ended: boolean
  paused: boolean
  readyState: number
}

function createPlayingVideo(): FakeVideo {
  return {
    currentTime: 1,
    ended: false,
    paused: false,
    readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('watchVideoPlayback', () => {
  test('再生時刻がタイムアウトまで進まない場合はフリーズを通知する', () => {
    vi.useFakeTimers()
    const video = createPlayingVideo()
    const onFreeze = vi.fn()
    watchVideoPlayback({
      checkIntervalMs: 500,
      freezeTimeoutMs: 5_000,
      onFreeze,
      video,
    })

    vi.advanceTimersByTime(4_999)
    expect(onFreeze).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onFreeze).toHaveBeenCalledTimes(1)
  })

  test('再生時刻が進んでいる間はフリーズとして扱わない', () => {
    vi.useFakeTimers()
    const video = createPlayingVideo()
    const onFreeze = vi.fn()
    const stopWatching = watchVideoPlayback({
      checkIntervalMs: 500,
      freezeTimeoutMs: 2_000,
      onFreeze,
      video,
    })

    for (let index = 0; index < 8; index += 1) {
      video.currentTime += 0.5
      vi.advanceTimersByTime(500)
    }

    expect(onFreeze).not.toHaveBeenCalled()
    stopWatching()
  })

  test('読み込み中や一時停止中の時間はタイムアウトへ含めない', () => {
    vi.useFakeTimers()
    const video = createPlayingVideo()
    const onFreeze = vi.fn()
    watchVideoPlayback({
      checkIntervalMs: 500,
      freezeTimeoutMs: 2_000,
      onFreeze,
      video,
    })

    video.paused = true
    vi.advanceTimersByTime(4_000)
    expect(onFreeze).not.toHaveBeenCalled()

    video.paused = false
    vi.advanceTimersByTime(2_499)
    expect(onFreeze).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onFreeze).toHaveBeenCalledTimes(1)
  })
})
