/**
 * UndoButton: 直前の操作を取り消す。
 *
 * `useHistoryAvailability().canUndo` で disabled 制御。
 * past が空のとき (= 取り消せる操作がない) は disabled でグレーアウト。
 *
 * memo 化は不要: Toolbar 親が毎回再 render しても、props を持たないこの
 * コンポーネントの描画コストは小さい。useHistoryAvailability の購読変化で
 * 再 render されるのが正常動作。
 */

import {
  useBoardDispatch,
  useHistoryAvailability,
} from '../../state/BoardContext'

export function UndoButton() {
  const dispatch = useBoardDispatch()
  const { canUndo } = useHistoryAvailability()

  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'UNDO' })}
      disabled={!canUndo}
      aria-label="元に戻す"
      className="cursor-pointer rounded-md bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800"
    >
      ← Undo
    </button>
  )
}
