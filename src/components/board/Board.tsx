/**
 * Board: VIEW_BOX_SIZE の SVG 盤面ルート。
 *
 * Phase 3 では <defs> + 背景 + ユニット 4 機の静的描画のみ。
 * インタラクション (ドラッグ、選択) は Phase 4 以降で追加する。
 *
 * 重要: この <svg> 内では Tailwind class を使わず、すべて属性で色を指定する。
 * Phase 9 の PNG 出力で外部 CSS が解決されない問題を避けるため。
 *
 * アクセシビリティ: <svg> ルートには role="img" + aria-label を指定し、
 * 支援技術には「戦術ボード」として認識させる。<title> をルートに置くと
 * 盤面全体の hover でツールチップが出てしまうので、盤面ルートには付けず、
 * 個々のユニット (UnitToken の <g><title> ... </title>) に持たせている。
 *
 * z-order: UNIT_IDS の並び順がそのまま描画順 (後勝ち) になる。
 * `self → ally → enemy1 → enemy2` の順なので enemy2 が最前面に描かれる。
 * Phase 4 以降で「選択中ユニットを最前面にしたい」等の要件が出た場合は
 * ここのソート順を調整する。
 */

import { VIEW_BOX_SIZE } from '../../constants/board'
import { UNIT_IDS } from '../../constants/game'
import { useBoard } from '../../state/BoardContext'
import { GridBackground } from './GridBackground'
import { SvgDefs } from './SvgDefs'
import { UnitToken } from './UnitToken'

export function Board() {
  const board = useBoard()

  return (
    <svg
      viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
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
