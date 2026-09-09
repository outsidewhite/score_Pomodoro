import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { AppHeader } from './AppHeader.tsx'
import type { StatusTone } from './statusTone.ts'

// 状態ごとの色はCSSで定義するため、CSSそのものを読み込んで対応を確認する。
function readCss(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

const headerCss = readCss('src/components/ui/AppHeader.css')
const timerCss = readCss('src/components/Timer/Timer.css')
const tokensCss = readCss('src/styles/tokens.css')

// セレクタ単位で宣言値を取り出し、CSS上の色指定をテストから確認できるようにする。
function getDeclaredValue(css: string, selector: string, property: string) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

  for (const block of withoutComments.split('}')) {
    const [selectorText, declarations] = block.split('{')
    if (declarations === undefined) continue

    const selectors = selectorText.split(',').map((value) => value.trim())
    if (!selectors.includes(selector)) continue

    const declaration = declarations
      .split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${property}:`))

    if (declaration) {
      return declaration.slice(property.length + 1).trim()
    }
  }

  return null
}

describe('AppHeader', () => {
  test('状態名と状態に応じたクラスを表示する', () => {
    render(<AppHeader status="計測中" statusTone="measuring" />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('計測中')
    expect(status).toHaveClass('app-header__status--measuring')
  })

  test('statusToneを省略した場合はセッション設定と同じ灰色の状態になる', () => {
    render(<AppHeader status="セッション設定" />)

    expect(screen.getByRole('status')).toHaveClass('app-header__status--setup')
  })

  test.each([
    { expectedToken: '--color-status-idle', tone: 'setup' },
    { expectedToken: '--color-status-measuring', tone: 'measuring' },
    { expectedToken: '--color-status-break', tone: 'break' },
    { expectedToken: '--color-status-idle', tone: 'away' },
    { expectedToken: '--color-status-measuring', tone: 'complete' },
  ] as const satisfies readonly { expectedToken: string; tone: StatusTone }[])(
    '$tone のランプは $expectedToken を使う',
    ({ expectedToken, tone }) => {
      expect(
        getDeclaredValue(headerCss, `.app-header__status--${tone} > span`, 'background'),
      ).toBe(`var(${expectedToken})`)
      // 状態色はトークンで管理し、ページ側へ直接色を書かない。
      expect(tokensCss).toContain(`${expectedToken}:`)
    },
  )
})

describe('ランプの色とタイマーの文字色の対応', () => {
  test.each([
    {
      lampSelector: '.app-header__status--measuring > span',
      state: '計測中',
      timeSelector: '.session-timer__time',
    },
    {
      lampSelector: '.app-header__status--break > span',
      state: '休憩中',
      timeSelector: '.session-timer--break .session-timer__time',
    },
    {
      lampSelector: '.app-header__status--away > span',
      state: '離席中',
      timeSelector: '.session-timer--away .session-timer__time',
    },
  ])('$state のランプとタイマーの文字色は同じトークンを参照する', ({
    lampSelector,
    timeSelector,
  }) => {
    const lampColor = getDeclaredValue(headerCss, lampSelector, 'background')
    const timeColor = getDeclaredValue(timerCss, timeSelector, 'color')

    expect(lampColor).toMatch(/^var\(--color-status-/)
    expect(timeColor).toBe(lampColor)
  })
})
