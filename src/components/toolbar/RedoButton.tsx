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
import { SECONDARY_BUTTON } from './buttonVariants'

export function RedoButton() {
  const dispatch = useBoardDispatch()
  const { canRedo } = useHistoryAvailability()

  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'REDO' })}
      disabled={!canRedo}
      aria-label="やり直す"
      className={SECONDARY_BUTTON}
    >
      Redo →
    </button>
  )
}
