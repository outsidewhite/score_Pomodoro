import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App.tsx'

const measurementPageMock = vi.hoisted(() => vi.fn())

vi.mock('./components/Notification/AppToaster.tsx', () => ({
  AppToaster: () => null,
}))

vi.mock('./pages/measurement/MeasurementPage.tsx', () => ({
  MeasurementPage: (props: {
    cameraError: string | null
    cameraStream: MediaStream | null
    onCameraRetry: () => void
    status: string
  }) => {
    measurementPageMock(props)
    return (
      <div data-testid="measurement-page">
        <span>{props.status}</span>
        <span>{props.cameraError}</span>
        <button type="button" onClick={props.onCameraRetry}>
          カメラを再取得
        </button>
      </div>
    )
  },
}))

describe('measurementの再読み込み', () => {
  const originalMediaDevices = navigator.mediaDevices

  beforeEach(() => {
    measurementPageMock.mockClear()
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/measurement')
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    })
    window.history.replaceState(null, '', '/start')
  })

  test('カメラ再取得に失敗してもmeasurementに留まり、ユーザー操作で再試行する', async () => {
    const user = userEvent.setup()
    const cameraStream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream
    const getUserMedia = vi.fn()
      .mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
      .mockResolvedValueOnce(cameraStream)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })

    render(<App />)

    expect(screen.getByTestId('measurement-page')).toBeInTheDocument()
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1))
    await screen.findByText('カメラの使用が許可されていません。ブラウザの設定から許可して、もう一度お試しください。')
    expect(window.location.pathname).toBe('/measurement')

    await user.click(screen.getByRole('button', { name: 'カメラを再取得' }))

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2))
    await screen.findByText('measuring')
    expect(window.location.pathname).toBe('/measurement')
  })
})
