/**
 * UnitToken の方向矢印テスト (Phase 7).
 *
 * 検証目的:
 * 1. `unit.direction` に応じて矢印 line と arrow head polygon が描画されること
 * 2. **幾何不変条件** (`UNIT_DIRECTION_LINE_OUTER + UNIT_DIRECTION_ARROW_HEAD_LENGTH
 *    <= UNIT_RADIUS - UNIT_STROKE_WIDTH/2`) を満たすこと。
 *    つまり矢印の最先端 (polygon の頂点) が円本体の bounding box 内に収まり、
 *    `UNIT_COORD_*_MIN/MAX` の安全範囲を変える必要がないこと。
 * 3. 矢印 group に `pointerEvents="none"` が付き、矢印領域からドラッグ判定が
 *    最外 <g> の onPointerDown に届く構造になっていること。
 *
 * これらは将来 board.ts の定数を弄ったり矢印描画を作り替えたりした時の早期検知
 * のためにテスト化する (ピクセル一致は脆いので「不変条件」だけ見る)。
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { UnitToken } from '../components/board/UnitToken'
import {
  UNIT_DIRECTION_ARROW_HEAD_LENGTH,
  UNIT_DIRECTION_LINE_OUTER,
  UNIT_RADIUS,
  UNIT_STROKE_WIDTH,
} from '../constants/board'
import { CHARACTERS } from '../data/characters'
import { BoardProvider } from '../state/BoardProvider'
import type { BoardState, Direction, Unit } from '../types/board'

afterEach(() => {
  cleanup()
})

/**
 * 任意の direction で 4 機のうち self だけを差し替えた BoardState を作る。
 * 他 3 機は INITIAL_BOARD_STATE 由来 (BoardProvider が補完する) で良いので、
 * `loadState` 用の minimal Unit を構築する。
 */
function makeStateWithDirection(direction: Direction): BoardState {
  const baseUnit = (id: Unit['id'], x: number, y: number): Unit => ({
    id,
    x,
    y,
    direction: id === 'self' ? direction : 0,
    cost: 3,
    starburst: 'none',
    coreType: 'B',
    lockTarget: null,
    characterId: null,
    hp: null,
    boost: 100,
  })
  return {
    units: {
      self: baseUnit('self', 360, 360),
      ally: baseUnit('ally', 460, 460),
      enemy1: baseUnit('enemy1', 260, 260),
      enemy2: baseUnit('enemy2', 460, 260),
    },
    teamRemainingCost: { ally: 6, enemy: 6 },
  }
}

/**
 * 円中心 (cx, cy) と任意座標 (x, y) のユークリッド距離。
 * 矢印頂点が `UNIT_RADIUS` 内に収まるかの検証で使う。
 */
function distance(cx: number, cy: number, x: number, y: number): number {
  return Math.hypot(x - cx, y - cy)
}

/**
 * SVG <polygon points="x1,y1 x2,y2 x3,y3"> の文字列を {x, y} 配列に parse する
 * 小さな helper. テスト内でしか使わないので fragile な split で十分。
 */
function parsePoints(points: string): { x: number; y: number }[] {
  return points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return { x, y }
    })
}

describe('UnitToken: direction arrow', () => {
  it('renders an arrow line + arrow head polygon for direction=0 (up)', () => {
    const state = makeStateWithDirection(0)
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    // 矢印 group は pointerEvents="none" + aria-hidden を持つ <g> で囲んでいる
    const arrowGroups = container.querySelectorAll('g[aria-hidden="true"]')
    expect(arrowGroups.length).toBeGreaterThan(0)
    // line と polygon が 1 つずつ存在する
    const arrowLine = container.querySelector('g[aria-hidden="true"] line')
    const arrowHead = container.querySelector('g[aria-hidden="true"] polygon')
    expect(arrowLine).not.toBeNull()
    expect(arrowHead).not.toBeNull()
  })

  it('arrow group has pointerEvents="none" so the outer <g> can still receive drag', () => {
    const state = makeStateWithDirection(90)
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    // SVG では React の pointerEvents prop は属性 pointer-events に変換される
    const arrowGroup = container.querySelector('g[aria-hidden="true"]')
    expect(arrowGroup?.getAttribute('pointer-events')).toBe('none')
  })

  // 幾何不変条件: 矢印 polygon の各頂点が円本体の bounding box 内に収まる
  // (= UNIT_COORD_*_MIN/MAX のクランプを変更せずに済む契約)
  // 4 主軸の 0 / 90 / 180 / 270 と斜め 45 / 135 / 225 / 315 すべてで確認する
  const allDirections: Direction[] = [0, 45, 90, 135, 180, 225, 270, 315]
  // 円中心からの安全な最大距離 (stroke 半幅を引いた値)
  const safeRadius = UNIT_RADIUS - UNIT_STROKE_WIDTH / 2

  it.each(allDirections)(
    'arrow vertices stay within the unit circle for direction=%i',
    (direction) => {
      const state = makeStateWithDirection(direction)
      const cx = state.units.self.x
      const cy = state.units.self.y
      const { container } = render(
        <BoardProvider initialState={state}>
          <svg viewBox="0 0 720 720">
            <UnitToken unit={state.units.self} />
          </svg>
        </BoardProvider>,
      )

      const polygon = container.querySelector('g[aria-hidden="true"] polygon')
      expect(polygon).not.toBeNull()
      const points = parsePoints(polygon!.getAttribute('points') ?? '')
      // 三角形 = 3 頂点
      expect(points).toHaveLength(3)

      // すべての頂点が円中心から safeRadius 以内
      for (const p of points) {
        const d = distance(cx, cy, p.x, p.y)
        expect(d).toBeLessThanOrEqual(safeRadius)
      }
    },
  )

  it('Issue #55: shows shortName when characterId is set, otherwise UNIT_LABELS', () => {
    const target = CHARACTERS[0]
    const state = makeStateWithDirection(0)
    const withChar: BoardState = {
      ...state,
      units: {
        ...state.units,
        self: {
          ...state.units.self,
          characterId: target.id,
          cost: target.cost,
        },
      },
    }

    const { container } = render(
      <BoardProvider initialState={withChar}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={withChar.units.self} />
        </svg>
      </BoardProvider>,
    )
    // ピル内のラベル本体は <tspan>{shortName}</tspan>
    const tspans = container.querySelectorAll('tspan')
    const labels = Array.from(tspans).map((t) => t.textContent ?? '')
    expect(labels).toContain(target.shortName)
  })

  it('Issue #55: title shows {unit-name}: {character-name} when characterId is set', () => {
    const target = CHARACTERS[0]
    const state = makeStateWithDirection(0)
    const withChar: BoardState = {
      ...state,
      units: {
        ...state.units,
        self: {
          ...state.units.self,
          characterId: target.id,
          cost: target.cost,
        },
      },
    }
    const { container } = render(
      <BoardProvider initialState={withChar}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={withChar.units.self} />
        </svg>
      </BoardProvider>,
    )
    const title = container.querySelector('title')?.textContent ?? ''
    expect(title).toContain(target.name)
    expect(title).toContain('自機')
  })

  it('Issue #55: title is the unit label only when characterId is null', () => {
    const state = makeStateWithDirection(0)
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    const title = container.querySelector('title')?.textContent?.trim() ?? ''
    expect(title).toBe('自機')
  })

  it('the line endpoint distance from center stays within (safeRadius - arrow head length)', () => {
    // 線の終点 (= 三角形の付け根) は UNIT_DIRECTION_LINE_OUTER の距離にあるはず。
    // 不変条件より OUTER + HEAD <= safeRadius なので OUTER <= safeRadius - HEAD。
    const state = makeStateWithDirection(45)
    const cx = state.units.self.x
    const cy = state.units.self.y
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    const line = container.querySelector('g[aria-hidden="true"] line')
    expect(line).not.toBeNull()
    const x2 = Number(line!.getAttribute('x2'))
    const y2 = Number(line!.getAttribute('y2'))
    const d = distance(cx, cy, x2, y2)
    // 浮動小数の端数を許容して 0.01 マージン
    expect(d).toBeLessThanOrEqual(UNIT_DIRECTION_LINE_OUTER + 0.01)
    expect(d).toBeLessThanOrEqual(safeRadius - UNIT_DIRECTION_ARROW_HEAD_LENGTH + 0.01)
  })
})

describe('UnitToken: HP/Boost stack (Issue #58)', () => {
  function makeWithHpBoost(opts: {
    hp?: number | null
    boost?: number
    characterId?: string | null
  } = {}): BoardState {
    const base = makeStateWithDirection(0)
    const characterId =
      opts.characterId !== undefined ? opts.characterId : CHARACTERS[0].id
    return {
      ...base,
      units: {
        ...base.units,
        self: {
          ...base.units.self,
          characterId,
          cost: characterId !== null ? CHARACTERS[0].cost : base.units.self.cost,
          hp: opts.hp !== undefined ? opts.hp : (characterId !== null ? CHARACTERS[0].maxHp : null),
          boost: opts.boost !== undefined ? opts.boost : 100,
        },
      },
    }
  }

  it('renders HP "{remain} / {max}" text when character is set and showHpBoost is ON (default)', () => {
    const state = makeWithHpBoost({ hp: 200 })
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    // 「200 / 680」のような分数テキストが含まれる
    const text = container.textContent ?? ''
    expect(text).toContain(`200 / ${CHARACTERS[0].maxHp}`)
  })

  it('renders Boost "{value} %" text', () => {
    const state = makeWithHpBoost({ hp: 200, boost: 75 })
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    const text = container.textContent ?? ''
    expect(text).toContain('75 %')
  })

  it('hp=0 (撃破) renders opacity=0.45 on the outer <g> (Codex/Gemini[共通] 反映)', () => {
    const state = makeWithHpBoost({ hp: 0 })
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    // 最外 <g> は viewBox の <svg> 直下の <g> (touchAction を持つもの)
    const outerG = container.querySelector('svg > g')
    expect(outerG).not.toBeNull()
    const opacity = outerG!.getAttribute('opacity')
    expect(opacity).toBe('0.45')
  })

  it('hp=null (機体未選択) does NOT trigger destroyed opacity (must distinguish 0 vs null)', () => {
    const state = makeWithHpBoost({ characterId: null, hp: null })
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    const outerG = container.querySelector('svg > g')
    expect(outerG?.getAttribute('opacity')).toBe('1')
  })

  it('hp=0 includes "(撃破)" in the title for accessibility', () => {
    const state = makeWithHpBoost({ hp: 0 })
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    const title = container.querySelector('title')?.textContent ?? ''
    expect(title).toContain('(撃破)')
  })

  it('does NOT render the HP stack when characterId is null (機体未選択時は HP 表示なし)', () => {
    const state = makeWithHpBoost({ characterId: null, hp: null, boost: 80 })
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    const text = container.textContent ?? ''
    // HP の分数テキストは出ない
    expect(text).not.toMatch(/\d+ \/ \d+/)
    // Boost は機体不問なので出る
    expect(text).toContain('80 %')
  })
})
