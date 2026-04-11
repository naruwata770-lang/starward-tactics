/**
 * useDrag: SVG 上のユニットを Pointer Events でドラッグするための hook。
 *
 * Phase 6 (Issue #7) で導入。
 *
 * 責務:
 * - PointerDown: setPointerCapture でこの要素に move/up を確実に流す。同時に
 *   setSelectedUnit でクリック選択も成立させる (ドラッグせずに離してもこれは残る)
 * - PointerMove: DOM 座標を SVG 座標に変換し、unit 中心の "オフセット保持" を
 *   かけた上で MOVE_UNIT を dispatch (ドラッグ中の present 更新だけで履歴に積まない)
 * - PointerUp: 動かしていれば COMMIT_MOVE を dispatch (= 1 ドラッグ 1 履歴)。
 *   動いていなければ何もしない (タップ扱い、history を消費しない)
 * - PointerCancel / LostPointerCapture: 「開始位置で COMMIT_MOVE」を打つ。
 *   withHistory.ts:130-140 の「`uncommittedFrom` 上で同一座標 → past 不変、
 *   present だけ snapback」分岐に乗せて、history を汚さずキャンセルする。
 *
 * なぜ pointercancel に dispatch({ type: 'UNDO' }) を使わないか:
 * `withHistory.ts:62-72` で mid-drag UNDO は uncommittedFrom にスナップバック
 * するロジックがあり、たまたま同じ動きになる。だが UNDO を流用すると将来
 * 「Ctrl+Z でユーザー意図の取り消し」を実装したとき、ブラウザ都合の中断
 * (alert / タブ切替 / 別 finger 干渉) と「ユーザーの明示的な取り消し」を
 * withHistory 内で区別できなくなる。後者の意図をコードに残すため、cancel は
 * COMMIT_MOVE + 同座標 no-op の専用経路に乗せる。
 *
 * SVG ルートの取得:
 * createSVGPoint / getScreenCTM は SVG ルート要素 (= <svg>) に対して呼ぶ必要がある。
 * UnitToken の最外 <g> から `event.currentTarget.ownerSVGElement` で取れる。
 * Provider や props で svgRef を流し込む案より依存が少ない。
 *
 * クランプ:
 * 座標範囲のクランプ (UNIT_COORD_*_MIN/MAX) は reducer 側に集約しているので、
 * この hook は **生の SVG 座標をそのまま dispatch** する。バリデーションを
 * 一箇所 (boardReducer) に集める方針。
 *
 * なぜ unit を引数で受け取り useBoard() を呼ばないか (PR #25 レビュー指摘 [共通: 高] 反映):
 * 当初は useBoard() で BoardPresentContext を購読していたが、`useContext` による
 * 再 render は `React.memo` を迂回するため、UnitToken を memo でラップした効果が
 * 完全に潰れていた (ドラッグ中の毎 MOVE_UNIT で全 4 機が再 render される)。
 * UnitToken はすでに `unit` を props で受け取って memo 化されているので、その
 * unit をそのまま useDrag に流し込めば、context 購読が消え memo の前提が成立する。
 * 結果: ドラッグ中は self の UnitToken だけが再 render され、他 3 機は memo で
 * スキップされる (`updateUnit` が変更ユニット以外の参照を保持する設計と整合)。
 */

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'

import { useBoardDispatch, useSelection } from '../state/BoardContext'
import type { Unit } from '../types/board'

// session 内に最終 dispatch 済み座標を持つ理由:
// pointerup 時に COMMIT_MOVE で使う「最終位置」を、ストア (BoardState) を再読みせず
// session 自身から取り出せるようにするため。これにより boardRef を持って render 中に
// 更新する必要がなくなり、React の「Cannot update ref during render」制約を踏まずに済む。

export interface UseDragArgs {
  /**
   * ドラッグ対象のユニット。
   *
   * UnitToken の props と同じオブジェクトをそのまま渡す前提。useBoard() で
   * 再購読しないことで UnitToken の memo 化が効くようにしている。
   *
   * pointerdown 時の開始座標に `unit.x` / `unit.y` を使う。useCallback の deps
   * に `unit.x` / `unit.y` を入れることで、ドラッグ中の self 以外 (= 座標が
   * 変わらないユニット) のハンドラ参照は安定し、UnitToken の memo もスキップする。
   */
  unit: Unit
}

export interface UseDragHandlers {
  onPointerDown: (e: ReactPointerEvent<SVGElement>) => void
  onPointerMove: (e: ReactPointerEvent<SVGElement>) => void
  onPointerUp: (e: ReactPointerEvent<SVGElement>) => void
  onPointerCancel: (e: ReactPointerEvent<SVGElement>) => void
  onLostPointerCapture: (e: ReactPointerEvent<SVGElement>) => void
}

/**
 * 1 ドラッグセッションの transient state。
 *
 * - `pointerId`: 受け付けたポインタ。マルチタッチで別 id が来ても無視するための識別子
 * - `originX/originY`: ユニット中心の開始座標。pointercancel 時の snapback 先
 * - `offsetX/offsetY`: pointerdown 時の「ユニット中心 - 指 SVG 座標」。move 時に
 *   これを足すことで「指でつかんだ位置がユニット内で固定される」自然な追従にする
 *   (掴んだ縁を中心へワープさせない)
 * - `lastX/lastY`: 最後に MOVE_UNIT へ渡した座標。pointerup 時の COMMIT_MOVE で
 *   使う「最終位置」。BoardState を読み直さず session 内で完結させる
 * - `moved`: 一度でも MOVE_UNIT を発火したか。タップと区別して up 時の COMMIT_MOVE 要否を判定
 *
 * `active` フィールドは持たない: `sessionRef.current !== null` で十分。
 * `startX/startY` (= 指の開始 client 座標) も持たない: offset が分かれば一意に変換できる。
 */
type DragSession = {
  pointerId: number
  originX: number
  originY: number
  offsetX: number
  offsetY: number
  lastX: number
  lastY: number
  moved: boolean
}

/**
 * client 座標 (DOM) → SVG 座標 (viewBox) 変換。
 *
 * `getScreenCTM().inverse()` を pointermove ごとに取り直すのは、ドラッグ中に
 * 画面回転やリサイズが起きて CTM が変わってもキャッシュ汚染で破綻しないため。
 *
 * `getScreenCTM()` は SVG が DOM に未アタッチだと null を返すので、その場合は
 * null を返して呼び出し側に判定を委ねる (MOVE_UNIT を発火しない)。
 */
function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const { x, y } = pt.matrixTransform(ctm.inverse())
  return { x, y }
}

export function useDrag({ unit }: UseDragArgs): UseDragHandlers {
  const unitId = unit.id
  const dispatch = useBoardDispatch()
  const { setSelectedUnit } = useSelection()

  const sessionRef = useRef<DragSession | null>(null)

  /**
   * ドラッグ終了の共通ルート。pointerup / pointercancel / lostpointercapture から呼ぶ。
   *
   * - reason='commit': moved=true なら session.lastX/Y で COMMIT_MOVE を打って
   *   1 ドラッグ 1 履歴を確定。moved=false (= 単純タップ) なら何も dispatch しない
   *   (history を消費しない)
   * - reason='snapback': 開始位置で COMMIT_MOVE を打って、withHistory の同座標
   *   no-op 分岐 (start === end) に乗せる。past を触らず present を snapback する
   */
  const endDrag = useCallback(
    (reason: 'commit' | 'snapback') => {
      const session = sessionRef.current
      if (!session) return
      sessionRef.current = null

      if (reason === 'snapback') {
        dispatch({
          type: 'COMMIT_MOVE',
          unitId,
          x: session.originX,
          y: session.originY,
        })
        return
      }

      // reason === 'commit'
      if (!session.moved) return
      dispatch({
        type: 'COMMIT_MOVE',
        unitId,
        x: session.lastX,
        y: session.lastY,
      })
    },
    [dispatch, unitId],
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGElement>) => {
      // すでに別ドラッグ進行中なら無視 (マルチタッチ対策)。withHistory の
      // 「1 ドラッグ = 1 ユニット」前提を守る。
      if (sessionRef.current !== null) return

      const svg = e.currentTarget.ownerSVGElement
      if (!svg) return

      const svgPoint = clientToSvg(svg, e.clientX, e.clientY)
      if (!svgPoint) return

      // setPointerCapture は一部ブラウザや happy-dom で例外を投げる可能性があるが、
      // capture が取れなくても「target が同じ要素なら」move/up は届く。
      // 空 catch ブロックの意図 (capture は best-effort) を ESLint no-empty に
      // 引っかからない形でコメント化しておく。
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* ignore: setPointerCapture is best-effort. capture が取れなくても move/up は届く */
      }

      sessionRef.current = {
        pointerId: e.pointerId,
        originX: unit.x,
        originY: unit.y,
        offsetX: unit.x - svgPoint.x,
        offsetY: unit.y - svgPoint.y,
        lastX: unit.x,
        lastY: unit.y,
        moved: false,
      }

      // 単純タップでも選択は更新する (Issue 完了条件 5: クリックで編集対象切替)
      setSelectedUnit(unitId)
    },
    // 注: deps に board ではなく unit.x / unit.y を入れている。これにより、
    // ドラッグ中の MOVE_UNIT で self の unit が新参照になっても、他 3 機の
    // unit (= updateUnit で参照保持されている) の onPointerDown は再生成されない。
    // UnitToken の memo 化と組み合わせて、他ユニットの再 render を完全にスキップする。
    [setSelectedUnit, unit.x, unit.y, unitId],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGElement>) => {
      const session = sessionRef.current
      if (!session || session.pointerId !== e.pointerId) return

      // SVG が DOM から外れた / CTM が取れない極端なケースでは、session が
      // 取り残されないよう snapback ルートで cleanup する (Gemini レビュー指摘 [中])。
      // この経路を無視して return すると、次に他ユニットを触った時に session 進行中
      // 判定で弾かれてしまう。
      const svg = e.currentTarget.ownerSVGElement
      if (!svg) {
        endDrag('snapback')
        return
      }
      const svgPoint = clientToSvg(svg, e.clientX, e.clientY)
      if (!svgPoint) {
        endDrag('snapback')
        return
      }

      // session.lastX/Y は **クランプ前の raw 値** を保持する。reducer 側で
      // UNIT_COORD_*_MIN/MAX にクランプされる前提で、ここでは生の SVG 座標を
      // そのまま記録する。画面外方向にドラッグして戻したケースでは「raw では
      // 動いた (= moved=true)」「実効値は不変」になるが、このとき endDrag('commit')
      // で発火する COMMIT_MOVE は withHistory.ts の同座標 no-op 分岐で吸収される
      // ので history は汚れない (boardReducer.test.ts / withHistory.test.ts で検証済)。
      // → 「moved=true でも実際には動いていない」ケースの責務分離は reducer 側に任せる。
      const nextX = svgPoint.x + session.offsetX
      const nextY = svgPoint.y + session.offsetY
      session.moved = true
      session.lastX = nextX
      session.lastY = nextY
      dispatch({ type: 'MOVE_UNIT', unitId, x: nextX, y: nextY })
    },
    [dispatch, endDrag, unitId],
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<SVGElement>) => {
      const session = sessionRef.current
      if (!session || session.pointerId !== e.pointerId) return
      endDrag('commit')
    },
    [endDrag],
  )

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<SVGElement>) => {
      const session = sessionRef.current
      if (!session || session.pointerId !== e.pointerId) return
      endDrag('snapback')
    },
    [endDrag],
  )

  // alert / タブ切替 / 別 finger 干渉などで pointercancel を呼ばずに capture が
  // 剥がれるブラウザ都合のケース。session が取り残されるのを防ぐため、ここでも
  // snapback ルートに合流させる。
  const onLostPointerCapture = useCallback(
    (e: ReactPointerEvent<SVGElement>) => {
      const session = sessionRef.current
      if (!session || session.pointerId !== e.pointerId) return
      endDrag('snapback')
    },
    [endDrag],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
  }
}
