/**
 * ShareButton: 現在の URL をクリップボードにコピーする。
 *
 * Phase 10 (Issue #11) で追加。Phase 5 では「URL バーがそのまま正解なので
 * 明示ボタンは不要」としていたが、ユーザビリティの観点で明示的なコピーボタンを
 * 追加する方針に変更した (URL バーを手動コピーする操作は非自明)。
 *
 * コピー成功後は 2 秒間ラベルを「✓ コピー」に変えるインライントースト方式。
 * 失敗時はラベルを変えず console.warn のみ (誤成功表示を防ぐ)。
 */

import { useEffect, useRef, useState } from 'react'

const TOAST_DURATION_MS = 2000

export function ShareButton() {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // コンポーネントアンマウント時に timer を cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch (e) {
      console.warn('Clipboard copy failed:', e)
      return
    }

    // 前回の timer が残っていたら cancel (連打対策)
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }

    setCopied(true)
    timerRef.current = setTimeout(() => {
      setCopied(false)
      timerRef.current = null
    }, TOAST_DURATION_MS)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="URLをコピー"
      aria-live="polite"
      className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2 cursor-pointer"
    >
      {copied ? '✓ コピー' : '🔗 共有'}
    </button>
  )
}
