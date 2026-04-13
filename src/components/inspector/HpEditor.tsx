/**
 * HpEditor: 選択ユニットの HP を編集する (Issue #58)。
 *
 * 構成: スライダー (range) + 数値入力 + 「最大に戻す」ボタン。
 * - スライダーで大まかに、数値入力で正確に編集できる二段構え
 * - characterId !== null のときだけ操作可能。null のときはヒント文を出す
 *
 * 値域: 0..maxHp (機体ごとに異なる)。reducer 側でも clamp + 整数化されるが、
 * UI 側で値域を絞ることでユーザー体験を一貫させる (slider が端でしっかり止まる)。
 *
 * ARIA: range input は要素自体が role="slider" を持つ。aria-label / aria-valuenow
 * を指定して支援技術にも撃破/残量を伝える。
 */

import { memo, useCallback } from 'react'

import { findCharacterById } from '../../data/characters'
import { useBoardDispatch } from '../../state/BoardContext'
import type { UnitId } from '../../types/board'

export interface HpEditorProps {
  unitId: UnitId
  characterId: string | null
  hp: number | null
}

export const HpEditor = memo(function HpEditor({
  unitId,
  characterId,
  hp,
}: HpEditorProps) {
  const dispatch = useBoardDispatch()
  const character = findCharacterById(characterId)

  const setHp = useCallback(
    (value: number) => {
      dispatch({ type: 'SET_HP', unitId, hp: value })
    },
    [dispatch, unitId],
  )

  if (character === null) {
    // 機体未選択時は HP の意味が無いので操作不可 + ヒント文。
    // disabled な input を出すよりも、その場で意図を伝える文の方が親切。
    return (
      <p className="text-xs text-slate-500">
        機体を選ぶと HP を編集できます
      </p>
    )
  }

  // 不変条件 (boardReducer): characterId !== null なら hp は number。
  // SET_HP(null) を禁止し SET_CHARACTER 経由でしか null 化されないため、
  // この分岐に来る時点で `hp === null` は通常起きない。万一 (LOAD_STATE で
  // 不整合 state を直接注入された等) に備えて maxHp に fallback。
  const maxHp = character.maxHp
  const current = hp ?? maxHp

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={maxHp}
          step={1}
          value={current}
          onChange={(e) => setHp(Number(e.target.value))}
          aria-label="HP スライダー"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={maxHp}
          className="flex-1 cursor-pointer accent-emerald-500"
        />
        <input
          type="number"
          min={0}
          max={maxHp}
          step={1}
          value={current}
          onChange={(e) => {
            // 空文字は `Number('')` で 0 になるため、編集中の中間状態を撃破扱い (HP=0)
            // にしてしまう (Codex レビュー指摘反映)。空文字は dispatch せず無視する。
            // ユーザーが Backspace で値を消した瞬間に「撃破」と誤判定されないように。
            if (e.target.value === '') return
            const v = Number(e.target.value)
            if (!Number.isFinite(v)) return
            setHp(v)
          }}
          aria-label="HP 数値入力"
          className="w-20 rounded-md bg-slate-800 px-2 py-1 text-right text-sm tabular-nums text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2"
        />
        <span className="text-xs tabular-nums text-slate-500">/ {maxHp}</span>
      </div>
      <button
        type="button"
        onClick={() => setHp(maxHp)}
        disabled={current === maxHp}
        className="cursor-pointer rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800"
      >
        HP 最大に戻す
      </button>
    </div>
  )
})
