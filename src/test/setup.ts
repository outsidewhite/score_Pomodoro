import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 各テスト後にレンダリング結果とDOMを片付け、テスト間の影響を防ぐ。
afterEach(() => {
  cleanup()
})
