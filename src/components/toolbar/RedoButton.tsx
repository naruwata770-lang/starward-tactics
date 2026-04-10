/**
 * RedoButton: 取り消した操作をやり直す。
 *
 * `useHistoryAvailability().canRedo` で disabled 制御。
 * future が空のとき (= 直前に Undo していない、または別の操作で future がクリア
 * された後) は disabled。
 */

import {
  useBoardDispatch,
  useHistoryAvailability,
} from '../../state/BoardContext'

export function RedoButton() {
  const dispatch = useBoardDispatch()
  const { canRedo } = useHistoryAvailability()

  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'REDO' })}
      disabled={!canRedo}
      aria-label="やり直す"
      className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800"
    >
      Redo →
    </button>
  )
}
