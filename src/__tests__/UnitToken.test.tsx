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

/**
 * makeWithHpBoost: HP/Boost テストおよび Issue #75 テストで再利用するヘルパー。
 * describe 外に置いてあるのは、複数 describe で共用するため。
 */
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

describe('UnitToken: HP/Boost stack (Issue #58)', () => {
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

/**
 * Issue #75 (iPhone Safari ドラッグ不可) 修正の回帰検知テスト。
 *
 * 検知意図:
 * iOS Safari は SVG 子要素 hit 時に親 <g> の touch-action chain 解決が不安定で、
 * ドラッグ判定が pointercancel に飲み込まれる (W3C / WebKit bug 200204 / 149854,
 * WPT pointerevent_touch-action-svg-none-test_touch.html 参照)。これを避けるため、
 * 最外 <g> 直下の装飾子要素は **<circle> 以外すべて** `pointer-events="none"` で
 * hit-test から透過させ、hit target を <circle> 本体に集約する設計にしている。
 *
 * 不変条件 (= テストで守る契約):
 * - 最外 <g> 直下の <circle> 以外の paintable 要素は、自身 (or 親 chain) のいずれかで
 *   `pointer-events="none"` が付与されていること
 * - <circle> には pointer-events 属性を付けない (= デフォルトの hit-able 維持)
 * - 最外 <g> の `touchAction:'none'` style が retain されている
 *
 * `<title>` は SVG 仕様上「非描画 / hit-test 対象外」なのでこの契約から除外される。
 *
 * テストの粒度 (Codex セカンドオピニオン反映):
 * happy-dom は WebKit の hit-test と touch-action 解決を再現しないため、
 * `fireEvent.pointerDown` で event bubble を確認しても実バグの代替にならない。
 * 代わりに「<circle> 以外の装飾要素は pointer-events="none" を **自身 or 祖先 chain で**
 * 持つ」を属性として assert することで、Phase 8 (#58) で起きたような「装飾追加時に
 * pointer-events 付与を忘れて Safari ドラッグが壊れる」回帰を直接的に防ぐ。
 *
 * 既存対応分の網羅 (4 種計画書 vs 6 種テスト):
 * 計画書では今回追加対象を「コスト text / SB rect / ピル rect / ピル text」の 4 種と
 * 整理しているが、Phase 7 (方向矢印) と Phase 8 (HP/Boost) で既に `pointer-events="none"`
 * 化されている要素も併せて契約として保持する (= 将来誰かが既存対応分を外しても落ちる)。
 */
describe('UnitToken: pointer-events transparency for iOS Safari drag (Issue #75)', () => {
  /**
   * 「`<circle>` 以外の direct child は、自身 or 祖先 chain のいずれかで
   * `pointer-events="none"` を持つ」を assert するヘルパー。
   *
   * tag allowlist (text/rect/g に限定) ではなく **denylist (<circle> と <title> のみ
   * skip)** で書く理由 (Codex 指摘反映): 将来最外 <g> 直下に別の paintable 要素
   * (`<path>` / `<polygon>` / `<line>` / `<image>` 等) が追加されても、契約から漏れずに
   * 検知できるため。
   *
   * 「自身 or 祖先 chain」で見る理由 (Claude subagent M1 反映): direct attribute だけだと
   * `<g pointerEvents="none">` ラッパーで透過している HP/Boost や 方向矢印の **内部の
   * <rect>/<text>** が assert に乗らない。将来「HP/Boost を <g> ラッパーから外して兄弟
   * 並びにリファクタした」ような変更で Safari 回帰が再発するのを直接防ぐため、
   * descendants まで walk して chain 解決を確認する。
   */
  function assertPointerEventsNoneOnSelfOrAncestor(
    el: Element,
    outerG: Element,
  ): void {
    let cursor: Element | null = el
    while (cursor !== null && cursor !== outerG.parentElement) {
      if (cursor.getAttribute('pointer-events') === 'none') return
      cursor = cursor.parentElement
    }
    throw new Error(
      `Expected element <${el.tagName.toLowerCase()}> to have pointer-events="none" ` +
        `on itself or an ancestor up to the outer <g>, but none was found. ` +
        `outerHTML: ${el.outerHTML.slice(0, 200)}`,
    )
  }

  it('every paintable descendant under the outer <g>, except <circle>, is pointer-events="none" via self or ancestor chain', () => {
    const state = makeWithHpBoost({ hp: 100 })
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    const outerG = container.querySelector('svg > g')
    expect(outerG).not.toBeNull()

    // descendants を全部走査。<title> と <circle> はスキップ:
    // - <title> は非描画で hit-test 対象外 (SVG 仕様)
    // - <circle> 本体は hit target として残すべき
    const allDescendants = Array.from(outerG!.querySelectorAll('*'))
    const paintables = allDescendants.filter((el) => {
      const tag = el.tagName.toLowerCase()
      if (tag === 'title') return false
      if (tag === 'circle') return false
      // <g> は描画されないが、hit-test の中継点として contract に乗せる:
      // 親 <g> に pointer-events="none" が付くと子全体が透過する SVG 仕様を頼りに
      // 「<g> 自身 or 祖先 chain で透過しているか」を確認することで、「<g> ラッパーを
      // 消したリファクタ」も検知できる
      return true
    })
    expect(paintables.length).toBeGreaterThan(0)
    for (const el of paintables) {
      assertPointerEventsNoneOnSelfOrAncestor(el, outerG!)
    }
  })

  it('the <circle> body stays hit-able (no pointer-events="none" attribute)', () => {
    const state = makeWithHpBoost({ hp: 100 })
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    const circle = container.querySelector('svg > g > circle')
    expect(circle).not.toBeNull()
    // hit target として残すために pointer-events 属性は付けない (= null)
    expect(circle!.getAttribute('pointer-events')).toBeNull()
    // 祖先 chain にも pointer-events="none" が無い (= 円本体まで hit-test が届く)
    let cursor: Element | null = circle!.parentElement
    while (cursor !== null && cursor.tagName.toLowerCase() !== 'svg') {
      expect(cursor.getAttribute('pointer-events')).not.toBe('none')
      cursor = cursor.parentElement
    }
  })

  it('the outer <g> keeps touchAction:"none" so drag wiring is preserved', () => {
    const state = makeWithHpBoost({ hp: 100 })
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    const outerG = container.querySelector('svg > g')
    expect(outerG).not.toBeNull()
    // React は style={{ touchAction: 'none' }} を element.style に反映する。
    // 文字列パースより style.touchAction を直接見る方が DOM シリアライズ形式に
    // 依存せず堅牢 (Gemini/Codex 共通指摘反映)。SVGElement の style は CSSStyleDeclaration。
    const style = (outerG as SVGElement).style
    expect(style.touchAction).toBe('none')
  })

  it('cost text is wrapped with pointer-events="none" (the digit must not capture taps)', () => {
    const state = makeWithHpBoost({ hp: 100 })
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    // コスト text は最外 g 直下の <text> のうち textContent が cost (数字) と等しいもの
    const directTexts = Array.from(
      container.querySelectorAll('svg > g > text'),
    )
    const costText = directTexts.find(
      (t) => t.textContent?.trim() === String(state.units.self.cost),
    )
    expect(costText).toBeDefined()
    expect(costText!.getAttribute('pointer-events')).toBe('none')
  })

  it('label text (with shortName + coreType tspans) has pointer-events="none" on the parent <text> (tspan inherits)', () => {
    const target = CHARACTERS[0]
    const state: BoardState = {
      ...makeWithHpBoost({ hp: target.maxHp }),
    }
    const { container } = render(
      <BoardProvider initialState={state}>
        <svg viewBox="0 0 720 720">
          <UnitToken unit={state.units.self} />
        </svg>
      </BoardProvider>,
    )
    // ピル text は <tspan>shortName</tspan> を子に持つ <text>
    const directTexts = Array.from(
      container.querySelectorAll('svg > g > text'),
    )
    const labelText = directTexts.find((t) =>
      t.querySelector('tspan')?.textContent === target.shortName,
    )
    expect(labelText).toBeDefined()
    expect(labelText!.getAttribute('pointer-events')).toBe('none')
    // 子 <tspan> には個別の pointer-events 属性は付けない (継承で十分なのでノイズ追加禁止)
    const tspans = labelText!.querySelectorAll('tspan')
    for (const tspan of Array.from(tspans)) {
      expect(tspan.getAttribute('pointer-events')).toBeNull()
    }
  })
})
