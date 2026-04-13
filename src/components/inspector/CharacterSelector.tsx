/**
 * CharacterSelector: ユニットに割り当てる機体を検索 / 選択する。
 *
 * 設計判断 (Issue #55 セカンドオピニオン Codex/Gemini[中] 反映):
 * - フル ARIA combobox pattern (listbox + roving tabindex + 矢印キー) は実装負債が
 *   重いため避け、既存セレクタ (`aria-pressed` ボタン群) と同じ流儀で実装する:
 *   - `role="searchbox"` の input + button list (aria-pressed)
 *   - キーボード矢印ナビは将来 Issue
 * - 検索なし時はコスト降順 (3 → 1.5) で section 表示
 * - 検索中は section を解体しマッチ全件をフラット表示 (検索体験を優先)
 *
 * cost 同期は reducer (SET_CHARACTER) が責務を持つ。ここでは dispatch するだけ。
 */

import { memo, useMemo, useState } from 'react'

import { CHARACTERS, type Character } from '../../data/characters'
import { useBoardDispatch } from '../../state/BoardContext'
import type { Cost, UnitId } from '../../types/board'

export interface CharacterSelectorProps {
  unitId: UnitId
  current: string | null
}

/** 機体リストの表示用ソート (cost 降順 → name 昇順)。検索なし時の section 表示用 */
function groupByCost(chars: readonly Character[]): Map<Cost, Character[]> {
  const map = new Map<Cost, Character[]>()
  for (const c of chars) {
    const arr = map.get(c.cost) ?? []
    arr.push(c)
    map.set(c.cost, arr)
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }
  return map
}

const COST_DISPLAY_ORDER: readonly Cost[] = [3, 2.5, 2, 1.5]

/** 検索文字列で Character をフィルタする (name + searchTokens 部分一致、大文字小文字無視) */
function matchesQuery(char: Character, queryLower: string): boolean {
  if (queryLower === '') return true
  if (char.name.toLowerCase().includes(queryLower)) return true
  if (char.shortName.toLowerCase().includes(queryLower)) return true
  for (const token of char.searchTokens) {
    if (token.toLowerCase().includes(queryLower)) return true
  }
  return false
}

interface CharacterButtonProps {
  char: Character
  isSelected: boolean
  onClick: () => void
}

function CharacterButton({ char, isSelected, onClick }: CharacterButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2 ${
        isSelected
          ? 'bg-violet-600 text-white'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      <span className="truncate">{char.name}</span>
      <span className="ml-2 shrink-0 font-mono text-xs text-slate-400">
        {char.cost}
      </span>
    </button>
  )
}

export const CharacterSelector = memo(function CharacterSelector({
  unitId,
  current,
}: CharacterSelectorProps) {
  const dispatch = useBoardDispatch()
  const [query, setQuery] = useState('')

  const queryLower = query.trim().toLowerCase()

  // フィルタ後リスト
  const filtered = useMemo(
    () => CHARACTERS.filter((c) => matchesQuery(c, queryLower)),
    [queryLower],
  )

  // 検索なし時のみ cost 別 section にグルーピング
  const grouped = useMemo(
    () => (queryLower === '' ? groupByCost(filtered) : null),
    [queryLower, filtered],
  )

  const handleSelect = (characterId: string | null) => {
    dispatch({ type: 'SET_CHARACTER', unitId, characterId })
  }

  return (
    <div className="space-y-2">
      <input
        type="search"
        role="searchbox"
        placeholder="機体名で検索..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="機体検索"
        className="w-full rounded-md bg-slate-800 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2"
      />

      <button
        type="button"
        aria-pressed={current === null}
        onClick={() => handleSelect(null)}
        className={`w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2 ${
          current === null
            ? 'bg-slate-200 text-slate-900'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
        }`}
      >
        未選択 (機体なし)
      </button>

      <div
        role="group"
        aria-label="機体リスト"
        className="max-h-72 space-y-3 overflow-y-auto pr-1"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-slate-500">
            該当する機体がありません
          </p>
        ) : grouped !== null ? (
          // 検索なし: cost 別グルーピング表示
          COST_DISPLAY_ORDER.map((cost) => {
            const chars = grouped.get(cost)
            if (!chars || chars.length === 0) return null
            return (
              <section key={cost} className="space-y-1">
                <h4 className="px-1 text-xs font-bold text-slate-500">
                  COST {cost}
                </h4>
                <div className="space-y-1">
                  {chars.map((char) => (
                    <CharacterButton
                      key={char.id}
                      char={char}
                      isSelected={current === char.id}
                      onClick={() => handleSelect(char.id)}
                    />
                  ))}
                </div>
              </section>
            )
          })
        ) : (
          // 検索中: フラット表示
          <div className="space-y-1">
            {filtered.map((char) => (
              <CharacterButton
                key={char.id}
                char={char}
                isSelected={current === char.id}
                onClick={() => handleSelect(char.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
