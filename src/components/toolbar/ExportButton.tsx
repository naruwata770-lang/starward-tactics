/**
 * ExportButton: 現在の盤面を PNG 画像としてダウンロードする。
 *
 * Phase 9 (Issue #10) で導入。
 *
 * ロジックは exportPng.ts に分離 (React Fast Refresh の制約:
 * コンポーネントファイルから非コンポーネント関数を export すると警告される)。
 */

import { useState } from 'react'

import { exportBoardAsPng } from './exportPng'

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false)

  const handleClick = async () => {
    setIsExporting(true)
    try {
      await exportBoardAsPng()
    } catch (e) {
      console.error('PNG export failed:', e)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isExporting}
      aria-label="PNG出力"
      className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800"
    >
      ↓ PNG
    </button>
  )
}
