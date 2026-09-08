import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdomはPointer Capture APIを実装していないため、スワイプ操作を扱う
// コンポーネント(Sonnerの通知など)のポインタ操作が例外にならないよう補う。
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => false
}

// 各テスト後にレンダリング結果とDOMを片付け、テスト間の影響を防ぐ。
afterEach(() => {
  cleanup()
})
