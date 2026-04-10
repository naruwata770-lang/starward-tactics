/**
 * SVG <defs>: 盤面で使い回す pattern / marker などを定義する。
 *
 * 現状は 48px グリッドの pattern のみ。Phase 5 以降でロックオンの矢印 marker を
 * 追加予定。
 *
 * 注意: ここで定義する色は SVG 属性ベース（fill/stroke）。Tailwind class は
 * 使わない（Phase 9 の PNG 出力で外部 CSS が解決されないため）。
 */

export const GRID_PATTERN_ID = 'tacticsboard-grid'

export function SvgDefs() {
  return (
    <defs>
      <pattern
        id={GRID_PATTERN_ID}
        width={48}
        height={48}
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 48 0 L 0 0 0 48"
          fill="none"
          stroke="#1e293b"
          strokeWidth={1}
        />
      </pattern>
    </defs>
  )
}
