import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  SAMPLES_PER_DETECTION_SEGMENT,
  SAMPLES_PER_INTERVAL,
  SCORE_INTERVAL_MS,
} from '../scoring/intervalScoring.ts'
import { usePoseScoring } from './usePoseScoring.ts'

const mediaPipeMocks = vi.hoisted(() => ({
  close: vi.fn(),
  createFromOptions: vi.fn(),
  detectForVideo: vi.fn(),
  forVisionTasks: vi.fn(),
}))

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: mediaPipeMocks.forVisionTasks,
  },
  PoseLandmarker: {
    createFromOptions: mediaPipeMocks.createFromOptions,
  },
}))

describe('usePoseScoringのモデル準備', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mediaPipeMocks.forVisionTasks.mockResolvedValue({})
  })

  test('読み込み失敗後にreloadRequestが変わると再読み込みする', async () => {
    const onModelLoadError = vi.fn()
    const onModelLoadStart = vi.fn()
    const onModelReady = vi.fn()
    mediaPipeMocks.createFromOptions
      .mockRejectedValueOnce(new Error('load failed'))
      .mockResolvedValueOnce({
        close: mediaPipeMocks.close,
      })

    const createOptions = (reloadRequest: number) => ({
      enabled: false,
      initialBaseline: null,
      initialIntervalNumber: 1,
      onAnalysisUnavailable: vi.fn(),
      onAwayDetected: vi.fn(),
      onBaselineChange: vi.fn(),
      onError: vi.fn(),
      onIntervalComplete: vi.fn(),
      onModelLoadError,
      onModelLoadStart,
      onModelReady,
      reloadRequest,
      sessionId: 'test-session',
      videoRef: { current: null },
    })

    const { rerender } = renderHook(
      ({ reloadRequest }) => usePoseScoring(createOptions(reloadRequest)),
      { initialProps: { reloadRequest: 0 } },
    )

    await waitFor(() => expect(onModelLoadError).toHaveBeenCalledTimes(1))
    expect(onModelReady).not.toHaveBeenCalled()

    rerender({ reloadRequest: 1 })

    await waitFor(() => expect(onModelReady).toHaveBeenCalledTimes(1))
    expect(onModelLoadStart).toHaveBeenCalledTimes(2)
    expect(mediaPipeMocks.createFromOptions).toHaveBeenCalledTimes(2)
  })
})

const DETECTION_SEGMENT_MS = SAMPLES_PER_DETECTION_SEGMENT * 500

function createShoulderLandmarks() {
  const landmarks = Array.from({ length: 33 }, () => ({
    visibility: 1,
    x: 0.5,
    y: 0.5,
    z: 0,
  }))
  landmarks[11] = { visibility: 1, x: 0.4, y: 0.5, z: 0 }
  landmarks[12] = { visibility: 1, x: 0.6, y: 0.5, z: 0 }
  return landmarks
}

// 500msごとの評価で「新しい映像フレーム」と判定されるよう、解析のたびに再生位置を進める。
function createFakeVideo() {
  let frameCount = 0
  const video = {
    get currentTime() {
      return frameCount
    },
    readyState: 4,
  }

  return {
    advanceFrame: () => {
      frameCount += 1
    },
    video: video as unknown as HTMLVideoElement,
  }
}

function createScoringHandlers() {
  return {
    onAnalysisUnavailable: vi.fn(),
    onAwayDetected: vi.fn(),
    onBaselineChange: vi.fn(),
    onError: vi.fn(),
    onIntervalComplete: vi.fn(),
    onModelLoadError: vi.fn(),
    onModelLoadStart: vi.fn(),
    onModelReady: vi.fn(),
  }
}

function renderScoringLoop(
  handlers: ReturnType<typeof createScoringHandlers>,
  video: HTMLVideoElement | null,
) {
  return renderHook(() =>
    usePoseScoring({
      ...handlers,
      enabled: true,
      initialBaseline: null,
      initialIntervalNumber: 1,
      reloadRequest: 0,
      sessionId: 'test-session',
      videoRef: { current: video },
    }),
  )
}

async function advanceLoop(durationMs: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(durationMs)
  })
}

describe('usePoseScoringの解析不能判定', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 解析ループはperformance.now()で経過を測るため、Dateと合わせてフェイク化する。
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'],
    })
    mediaPipeMocks.forVisionTasks.mockResolvedValue({})
    mediaPipeMocks.createFromOptions.mockResolvedValue({
      close: mediaPipeMocks.close,
      detectForVideo: mediaPipeMocks.detectForVideo,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('解析不能が1区間だけでは計測を停止しない', async () => {
    const handlers = createScoringHandlers()
    // 映像を取得できない状態では、すべての評価がmissedになり解析可能件数が0になる。
    renderScoringLoop(handlers, null)

    await advanceLoop(DETECTION_SEGMENT_MS)

    expect(handlers.onAnalysisUnavailable).not.toHaveBeenCalled()
  })

  test('解析不能が2区間連続すると停止要求を1回だけ返す', async () => {
    const handlers = createScoringHandlers()
    renderScoringLoop(handlers, null)

    await advanceLoop(DETECTION_SEGMENT_MS * 2)
    expect(handlers.onAnalysisUnavailable).toHaveBeenCalledTimes(1)

    // 停止後は解析ループ自体が止まるため、時間を進めても再通知しない。
    await advanceLoop(SCORE_INTERVAL_MS)
    expect(handlers.onAnalysisUnavailable).toHaveBeenCalledTimes(1)
  })

  test('解析不能で停止した場合は区間スコアを確定せず離席にもしない', async () => {
    const handlers = createScoringHandlers()
    renderScoringLoop(handlers, null)

    await advanceLoop(SCORE_INTERVAL_MS * 2)

    expect(handlers.onAnalysisUnavailable).toHaveBeenCalledTimes(1)
    expect(handlers.onIntervalComplete).not.toHaveBeenCalled()
    expect(handlers.onAwayDetected).not.toHaveBeenCalled()
  })

  test('1分区間の完了と同時に停止が成立した場合もスコアを確定しない', async () => {
    const handlers = createScoringHandlers()
    const { advanceFrame, video } = createFakeVideo()
    let detectCount = 0
    // 前半2区間は解析成功、後半2区間は解析失敗にして、停止成立を120サンプル目へ重ねる。
    mediaPipeMocks.detectForVideo.mockImplementation(() => {
      advanceFrame()
      detectCount += 1
      if (detectCount > SAMPLES_PER_DETECTION_SEGMENT * 2) {
        throw new Error('detect failed')
      }
      return { landmarks: [createShoulderLandmarks()] }
    })

    renderScoringLoop(handlers, video)

    await advanceLoop(SCORE_INTERVAL_MS)

    // 120サンプル目、つまり1分区間の完了境界と同じタイミングで停止したことを固定する。
    expect(detectCount).toBe(SAMPLES_PER_INTERVAL)
    expect(handlers.onAnalysisUnavailable).toHaveBeenCalledTimes(1)
    expect(handlers.onIntervalComplete).not.toHaveBeenCalled()
    expect(handlers.onAwayDetected).not.toHaveBeenCalled()
  })
})
