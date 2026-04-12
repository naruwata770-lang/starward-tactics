/**
 * ExportButton のテスト。
 *
 * Canvas/Blob/Image はブラウザ API 依存のため、テスト対象を 2 層に分ける:
 * - prepareExportSvg: Canvas 非依存。clone → data-no-export 除去 → 属性設定
 * - buildExportFilename: Date → ファイル名フォーマット
 * - ボタン描画: render + aria-label 確認
 *
 * 実際の PNG 生成はブラウザ手動検証で担保する。
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EXPORT_SCALE, VIEW_BOX_SIZE } from '../constants/board'
import { ExportButton } from '../components/toolbar/ExportButton'
import {
  buildExportFilename,
  prepareExportSvg,
} from '../components/toolbar/exportPng'
import { BoardProvider } from '../state/BoardProvider'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('prepareExportSvg', () => {
  function createTestSvg(): SVGSVGElement {
    const svg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    )
    svg.setAttribute('viewBox', `0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`)
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.setAttribute('overflow', 'visible')

    const circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    )
    circle.setAttribute('cx', '100')
    circle.setAttribute('cy', '100')
    circle.setAttribute('r', '30')
    svg.appendChild(circle)

    const noExportGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g',
    )
    noExportGroup.setAttribute('data-no-export', 'true')
    const picker = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    )
    picker.setAttribute('cx', '200')
    picker.setAttribute('cy', '200')
    picker.setAttribute('r', '14')
    noExportGroup.appendChild(picker)
    svg.appendChild(noExportGroup)

    return svg
  }

  it('removes all data-no-export="true" elements from the clone', () => {
    const svg = createTestSvg()
    const clone = prepareExportSvg(svg)

    expect(clone.querySelectorAll('[data-no-export="true"]')).toHaveLength(0)
    // 通常の要素は残っている
    expect(clone.querySelectorAll('circle')).toHaveLength(1)
  })

  it('does not mutate the original SVG', () => {
    const svg = createTestSvg()
    prepareExportSvg(svg)

    expect(svg.querySelectorAll('[data-no-export="true"]')).toHaveLength(1)
    expect(svg.querySelectorAll('circle')).toHaveLength(2)
  })

  it('sets xmlns on the clone', () => {
    const svg = createTestSvg()
    const clone = prepareExportSvg(svg)

    expect(clone.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
  })

  it('sets width and height to export size (VIEW_BOX_SIZE * EXPORT_SCALE)', () => {
    const svg = createTestSvg()
    const clone = prepareExportSvg(svg)
    const exportSize = VIEW_BOX_SIZE * EXPORT_SCALE

    expect(clone.getAttribute('width')).toBe(String(exportSize))
    expect(clone.getAttribute('height')).toBe(String(exportSize))
  })

  it('removes overflow attribute', () => {
    const svg = createTestSvg()
    expect(svg.getAttribute('overflow')).toBe('visible')

    const clone = prepareExportSvg(svg)
    expect(clone.getAttribute('overflow')).toBeNull()
  })

  it('preserves viewBox', () => {
    const svg = createTestSvg()
    const clone = prepareExportSvg(svg)

    expect(clone.getAttribute('viewBox')).toBe(
      `0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`,
    )
  })
})

describe('buildExportFilename', () => {
  it('formats date as starward-tactics_YYYY-MM-DD_HHmm.png', () => {
    // 2026-04-12 14:05
    const date = new Date(2026, 3, 12, 14, 5)
    expect(buildExportFilename(date)).toBe(
      'starward-tactics_2026-04-12_1405.png',
    )
  })

  it('pads single-digit month, day, hour, minute with zero', () => {
    // 2025-01-03 09:07
    const date = new Date(2025, 0, 3, 9, 7)
    expect(buildExportFilename(date)).toBe(
      'starward-tactics_2025-01-03_0907.png',
    )
  })
})

describe('ExportButton', () => {
  it('renders a button with aria-label "PNG出力"', () => {
    render(
      <BoardProvider>
        <ExportButton />
      </BoardProvider>,
    )
    expect(
      screen.getByRole('button', { name: 'PNG出力' }),
    ).toBeDefined()
  })
})
