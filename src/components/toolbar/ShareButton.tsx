/**
 * ShareButton: 現在の盤面状態を共有 URL としてクリップボードにコピーする。
 *
 * Phase 10 (Issue #11) で追加。Phase 5 では「URL バーがそのまま正解なので
 * 明示ボタンは不要」としていたが、ユーザビリティの観点で明示的なコピーボタンを
 * 追加する方針に変更した (URL バーを手動コピーする操作は非自明)。
 *
 * コピー成功後は 2 秒間ラベルを「✓ コピー」に変えるインライントースト方式。
 * 失敗時はラベルを変えず console.warn のみ (誤成功表示を防ぐ)。
 *
 * URL の生成: useUrlSync のデバウンス (300ms) 完了前に共有ボタンが押された場合、
 * window.location.href は古い ?b= を返す。そのため board state から直接
 * encode して URL を組み立てる。
 */

import { useEffect, useRef, useState } from 'react'

import { useBoard } from '../../state/BoardContext'
import { encode, isInitialEncoded } from '../../state/urlCodec'
import { PRIMARY_STRONG_BUTTON } from './buttonVariants'

const TOAST_DURATION_MS = 2000

export function ShareButton() {
  const board = useBoard()
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
    // board state から直接 URL を生成 (デバウンス完了を待たずに最新状態を共有)
    const encoded = encode(board)
    const url = new URL(window.location.href)
    if (isInitialEncoded(encoded)) {
      url.searchParams.delete('b')
    } else {
      url.searchParams.set('b', encoded)
    }

    try {
      await navigator.clipboard.writeText(url.toString())
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
      // min-w: ラベル切替 (🔗 共有 ↔ ✓ コピー) で primary 強調が横幅ジャンプしないよう固定
      className={`${PRIMARY_STRONG_BUTTON} min-w-[6.5rem]`}
    >
      {copied ? '✓ コピー' : '🔗 共有'}
    </button>
  )
}
