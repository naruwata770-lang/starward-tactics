/**
 * Board: 720x720 の SVG 盤面ルート。
 *
 * Phase 3 では <defs> + 背景 + ユニット 4 機の静的描画のみ。
 * インタラクション（ドラッグ、選択）は Phase 4 以降で追加する。
 *
 * 重要: この <svg> 内では Tailwind class を使わず、すべて属性で色を指定する。
 * Phase 9 の PNG 出力で外部 CSS が解決されない問題を避けるため。
 */

import { UNIT_IDS } from '../../constants/game'
import { useBoard } from '../../state/BoardContext'
import { GridBackground } from './GridBackground'
import { SvgDefs } from './SvgDefs'
import { UnitToken } from './UnitToken'

export function Board() {
  const board = useBoard()

  return (
    <svg
      viewBox="0 0 720 720"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      role="img"
      aria-label="戦術ボード"
    >
      <SvgDefs />
      <GridBackground />
      {UNIT_IDS.map((id) => (
        <UnitToken key={id} unit={board.units[id]} />
      ))}
    </svg>
  )
}
