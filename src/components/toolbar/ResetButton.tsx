/**
 * ResetButton: 盤面を初期状態に戻す (履歴ごとクリア)。
 *
 * 誤操作防止のため `window.confirm` で確認を取る。
 * - MVP として `window.confirm` で十分 (Reset 自体が頻繁ではない操作)
 * - 独自モーダルは Phase 5 では作らない (UI primitive を増やすより本筋を優先)
 *
 * RESET action は withHistory の `RESETTING` セットに含まれており、
 * past / future / uncommittedFrom が全てクリアされる (元に戻る道筋を絶つ)。
 */

import { useBoardDispatch } from '../../state/BoardContext'

export function ResetButton() {
  const dispatch = useBoardDispatch()

  function handleClick() {
    // SSR ガード: window.confirm が無い環境では即実行 (テストの jsdom/happy-dom は持つ)
    const ok =
      typeof window === 'undefined'
        ? true
        : window.confirm('盤面を初期状態に戻します。よろしいですか？')
    if (!ok) return
    dispatch({ type: 'RESET' })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="盤面をリセット"
      className="cursor-pointer rounded-md bg-rose-900 px-3 py-1.5 text-sm font-bold text-rose-100 transition hover:bg-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2"
    >
      Reset
    </button>
  )
}
