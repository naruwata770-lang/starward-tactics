/**
 * LockLines: 全ユニットの lockTarget を走査し、ロック線をまとめて描画する。
 *
 * Board.tsx の描画レイヤーで GridBackground と UnitToken の間に配置し、
 * 線がユニットトークンの下に潜り込むようにする。
 * pointerEvents="none" で操作を阻害せず、aria-hidden で支援技術をスキップ。
 */

import { UNIT_IDS } from '../../constants/game'
import { useBoard } from '../../state/BoardContext'
import { LockLine } from './LockLine'
import { getLockLineGeometry } from './lockLineGeometry'

export function LockLines() {
  const board = useBoard()

  return (
    <g pointerEvents="none" aria-hidden="true">
      {UNIT_IDS.map((id) => {
        const unit = board.units[id]
        if (unit.lockTarget == null) return null

        const target = board.units[unit.lockTarget]
        const geometry = getLockLineGeometry(unit, target)
        if (geometry == null) return null

        return <LockLine key={id} geometry={geometry} />
      })}
    </g>
  )
}
