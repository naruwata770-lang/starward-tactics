/**
 * InspectorPanel: 編集対象ユニットのコスト/SB/コア/ロック対象を編集する右サイドバー。
 *
 * 設計判断:
 * - selectedUnit が null の場合 (Phase 5+ で実装される「選択解除」など) は
 *   UnitSelector だけ表示し、他のセレクタは空のヒントを出す。
 * - 各セレクタは「現在値」を props で受け取り、変更は dispatch で flow させる
 *   (state は BoardContext 内で完結)。
 * - 参考元 (kuro7983 の EXVS2IB 戦術ボード) は combobox 主体だが、こちらは
 *   sidebar 幅 (320px) が広く、ボタン群の方が一覧性が良いのでボタン式にする。
 */

import type { ReactNode } from 'react'

import { useBoard, useSelection } from '../../state/BoardContext'
import { CharacterSelector } from './CharacterSelector'
import { CoreTypeSelector } from './CoreTypeSelector'
import { CostSelector } from './CostSelector'
import { LockTargetSelector } from './LockTargetSelector'
import { StarburstGauge } from './StarburstGauge'
import { UnitSelector } from './UnitSelector'

interface SectionProps {
  title: string
  children: ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function InspectorPanel() {
  const board = useBoard()
  const { selectedUnit } = useSelection()
  const unit = selectedUnit ? board.units[selectedUnit] : null

  return (
    <div className="space-y-5">
      <Section title="編集中">
        <UnitSelector />
      </Section>

      {unit && selectedUnit ? (
        <>
          <Section title="機体">
            <CharacterSelector
              unitId={selectedUnit}
              current={unit.characterId}
            />
          </Section>

          <Section title="コスト">
            <CostSelector
              unitId={selectedUnit}
              current={unit.cost}
              disabled={unit.characterId !== null}
            />
            {unit.characterId !== null && (
              <p className="text-xs text-slate-500">
                機体選択中はコストが固定されます
              </p>
            )}
          </Section>

          <Section title="覚醒">
            <StarburstGauge
              unitId={selectedUnit}
              current={unit.starburst}
            />
          </Section>

          <Section title="コア">
            <CoreTypeSelector
              unitId={selectedUnit}
              current={unit.coreType}
            />
          </Section>

          <Section title="ロック対象">
            <LockTargetSelector
              unitId={selectedUnit}
              current={unit.lockTarget}
            />
          </Section>
        </>
      ) : (
        <p className="text-sm text-slate-400">ユニットを選択してください</p>
      )}
    </div>
  )
}
