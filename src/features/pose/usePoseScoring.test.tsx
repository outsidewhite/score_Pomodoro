import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { usePoseScoring } from './usePoseScoring.ts'

const mediaPipeMocks = vi.hoisted(() => ({
  close: vi.fn(),
  createFromOptions: vi.fn(),
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
