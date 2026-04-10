/**
 * UnitToken: 1 機分のユニット表示。
 *
 * 構成 (上から下):
 * - 円本体 (色つき)
 *   - コスト数値: 円中央、太字白。「最も大事な数字を中央に大きく」(参考元 kuro7983 と同方針)
 *   - SB ゲージ: 円下部内側に 2 セグメントの小バー (none/half/full)
 * - 名前ピル: 円の下に配置
 *   - 「{ユニット名} {コア略称}」を表示。コア略称は CORE_TYPES の色で着色 (一目で識別)
 *
 * Phase 4 以降の予定:
 * - `unit.direction` を反映した方向インジケータ (Phase 7)
 * - 選択中のハイライト (Phase 6 でドラッグと共に)
 * - ロックオン線 (Phase 8)
 *
 * 重要: SVG 内の色は fill/stroke 属性で指定する (Tailwind class 禁止)。
 * Phase 9 の PNG 出力で XMLSerializer → Canvas 変換時に外部 CSS が解決されないため。
 *
 * 描画寸法 (UNIT_RADIUS / UNIT_LABEL_* / UNIT_SB_* / UNIT_COST_FONT_SIZE) は
 * すべて constants/board.ts に集約しており、boardReducer の座標クランプも
 * 同じ定数を参照して安全範囲を導出している。
 */

import {
  UNIT_COST_FONT_SIZE,
  UNIT_LABEL_FONT_SIZE,
  UNIT_LABEL_GAP,
  UNIT_LABEL_HEIGHT,
  UNIT_LABEL_STROKE_WIDTH,
  UNIT_LABEL_WIDTH,
  UNIT_RADIUS,
  UNIT_SB_BAR_GAP,
  UNIT_SB_BAR_HEIGHT,
  UNIT_SB_BAR_WIDTH,
  UNIT_SB_Y_OFFSET,
  UNIT_STROKE_WIDTH,
} from '../../constants/board'
import { CORE_TYPES, UNIT_COLORS, UNIT_LABELS } from '../../constants/game'
import type { StarburstLevel, Unit } from '../../types/board'

// 円中心からラベル上端までの距離。constants の UNIT_RADIUS と UNIT_LABEL_GAP の和。
const LABEL_OFFSET_Y = UNIT_RADIUS + UNIT_LABEL_GAP
// ピル型の角丸半径 (高さの半分)
const LABEL_CORNER_RADIUS = UNIT_LABEL_HEIGHT / 2

// SB バーの色
// 空状態をピル背景と同じ濃い紺にすることで、円の明色 (sky/blue/red/rose) とのコントラストを強くする
// (薄い slate だと色付き円の上で見えにくい)
const SB_BAR_FILLED = '#fbbf24' // amber-400
const SB_BAR_EMPTY = '#0f172a' // slate-900 (pill 背景と同色)

/**
 * StarburstLevel から「点灯セグメント数 (0..2)」を返す。
 * none → 0 / half → 1 / full → 2
 */
function sbFillCount(level: StarburstLevel): number {
  switch (level) {
    case 'none':
      return 0
    case 'half':
      return 1
    case 'full':
      return 2
  }
}

// コア種別 → 色 のルックアップ。CORE_TYPES は配列なので id をキーに引く。
const CORE_TYPE_COLOR: Record<Unit['coreType'], string> = Object.fromEntries(
  CORE_TYPES.map(({ id, color }) => [id, color]),
) as Record<Unit['coreType'], string>

export interface UnitTokenProps {
  unit: Unit
}

export function UnitToken({ unit }: UnitTokenProps) {
  const color = UNIT_COLORS[unit.id]
  const label = UNIT_LABELS[unit.id]
  const coreColor = CORE_TYPE_COLOR[unit.coreType]
  const sbCount = sbFillCount(unit.starburst)

  // SB ゲージ 2 バーの x 配置 (円中央に対称)
  // 全体幅 = 2 * BAR_WIDTH + GAP, 中央寄せなので left = -(全体幅 / 2)
  const sbTotalWidth = UNIT_SB_BAR_WIDTH * 2 + UNIT_SB_BAR_GAP
  const sbLeftX = unit.x - sbTotalWidth / 2

  return (
    <g>
      {/* SVG 単独で開いたときやスクリーンリーダーでユニットを識別できるように */}
      <title>{label}</title>

      {/* 本体: 円 */}
      <circle
        cx={unit.x}
        cy={unit.y}
        r={UNIT_RADIUS}
        fill={color}
        stroke="#0f172a"
        strokeWidth={UNIT_STROKE_WIDTH}
      />

      {/*
        コスト数値: 円中央。font 20 太字白。
        y を少し上にずらしているのは、下に SB ゲージを置くためのスペース確保。
      */}
      <text
        x={unit.x}
        y={unit.y - 2}
        fill="#f8fafc"
        fontSize={UNIT_COST_FONT_SIZE}
        fontWeight={700}
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {unit.cost}
      </text>

      {/*
        SB ゲージ: 2 セグメント小バー。
        none = 両方 dim, half = 左のみ点灯, full = 両方点灯
      */}
      {[0, 1].map((i) => {
        const filled = i < sbCount
        return (
          <rect
            key={i}
            x={sbLeftX + i * (UNIT_SB_BAR_WIDTH + UNIT_SB_BAR_GAP)}
            y={unit.y + UNIT_SB_Y_OFFSET}
            width={UNIT_SB_BAR_WIDTH}
            height={UNIT_SB_BAR_HEIGHT}
            rx={1}
            ry={1}
            fill={filled ? SB_BAR_FILLED : SB_BAR_EMPTY}
          />
        )
      })}

      {/* 名前ラベル: ピル型の背景 */}
      <rect
        x={unit.x - UNIT_LABEL_WIDTH / 2}
        y={unit.y + LABEL_OFFSET_Y}
        width={UNIT_LABEL_WIDTH}
        height={UNIT_LABEL_HEIGHT}
        rx={LABEL_CORNER_RADIUS}
        ry={LABEL_CORNER_RADIUS}
        fill="#0f172a"
        stroke={color}
        strokeWidth={UNIT_LABEL_STROKE_WIDTH}
      />

      {/*
        ピルテキスト: 「{ユニット名} {コア略称}」
        コア略称は CORE_TYPES の色で着色して識別性を上げる。
        textAnchor="middle" によって全体 (tspan 含む) の中心が unit.x に揃う。
      */}
      <text
        x={unit.x}
        y={unit.y + LABEL_OFFSET_Y + UNIT_LABEL_HEIGHT / 2}
        fill="#e2e8f0"
        fontSize={UNIT_LABEL_FONT_SIZE}
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        <tspan>{label}</tspan>
        <tspan dx={4} fill={coreColor} fontWeight={800}>
          {unit.coreType}
        </tspan>
      </text>
    </g>
  )
}
