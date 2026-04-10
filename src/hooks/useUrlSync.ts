/**
 * URL クエリ ↔ 盤面状態の双方向同期 hook。
 *
 * Phase 5 (Issue #6) で導入。レビュー指摘 (race condition) を反映して 2 周目改修。
 *
 * 責務:
 * 1. state 変更時にデバウンス (300ms) で `?b=...` を書き戻す
 * 2. ブラウザの戻る/進む (popstate) で URL から再復元 (LOAD_STATE / RESET)
 *
 * **マウント時の URL 復元は App.tsx 側で同期的に initialState 経由で実施する**。
 * これにより:
 * - 初回 1 フレームのフラッシュが消える (BoardProvider が最初から正しい state)
 * - mount 時に「初期 state を URL に書き戻す」race が消える
 * - useUrlSync は state→URL 方向と popstate にだけ集中できる
 *
 * 無限ループ防止戦略 (idempotent パターン):
 * - フラグ中心ではなく **encoded 文字列の比較中心** で同期する
 * - `lastWrittenEncodedRef`: 最後に URL へ書き込んだ encoded 文字列
 *   (初期化時に現在の URL の `b` を読んで記録するため、初期 board と一致すれば
 *   state→URL effect は早期 return する)
 * - state → URL: `encode(board)` が `lastWrittenEncodedRef` と一致したらスキップ
 * - popstate 経路では、応答の前に必ず保留中の pending タイマーを cancel する
 *   (古い pending が後から発火して URL を上書きする race を防ぐ)
 *
 * default state と同値なら `?b=` パラメータ自体を削除する (URL を綺麗に保つ)。
 * SSR ガード: `typeof window !== 'undefined'` で念のため早期 return。
 *
 * encode の throw 防御: 万一 reducer バグや型外データで encodeV1Unit が throw
 * した場合に effect が render phase を破壊しないよう、try/catch で囲む。
 */

import { useEffect, useRef } from 'react'

import {
  useBoard,
  useBoardDispatch,
} from '../state/BoardContext'
import { INITIAL_BOARD_STATE } from '../constants/game'
import { decode, encode, isInitialEncoded } from '../state/urlCodec'

const URL_PARAM_KEY = 'b'
const DEBOUNCE_MS = 300

/**
 * URL の `?b=` パラメータを取得 (なければ null)。SSR ガード付き。
 */
function readUrlParam(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(URL_PARAM_KEY)
}

/**
 * URL の `?b=` パラメータを書き換える。
 * - encoded が null の場合は削除
 * - encoded が指定されている場合は set
 *
 * `history.replaceState` で履歴を汚染しない (pushState を使うとドラッグごとに
 * 履歴エントリが増えてブラウザの戻る/進むが破壊される)。
 */
function writeUrlParam(encoded: string | null): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (encoded === null) {
    url.searchParams.delete(URL_PARAM_KEY)
  } else {
    url.searchParams.set(URL_PARAM_KEY, encoded)
  }
  window.history.replaceState(window.history.state, '', url.toString())
}

/**
 * board → encoded を防御的に実行。
 * 万一 throw した場合は null を返し、呼び出し側でスキップさせる。
 */
function safeEncode(board: Parameters<typeof encode>[0]): string | null {
  try {
    return encode(board)
  } catch {
    return null
  }
}

export function useUrlSync(): void {
  const board = useBoard()
  const dispatch = useBoardDispatch()

  /**
   * 最後に URL へ書き込んだ (または初期化時に URL から読んだ) encoded 文字列。
   * state → URL 方向のループ防止に使う。
   *
   * 初期化時に現在 URL の `b` を読んで記録することで、App.tsx で initialState
   * 経由で復元された state と一致した場合に再書き込みをスキップできる。
   */
  const lastWrittenEncodedRef = useRef<string | null>(readUrlParam())

  /**
   * デバウンス用 timeout の id。
   * popstate / アンマウント時に cancel するために保持する。
   */
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * デバウンス中の最新 encoded。アンマウント flush で使う。
   */
  const pendingEncodedRef = useRef<string | null>(null)

  /**
   * 保留中のデバウンスタイマーを cancel + pending クリア。
   * popstate (= URL → state 方向) のときに呼ぶことで、古い pending write が
   * 復元後の URL を上書きする race を防ぐ。
   */
  function cancelPendingWrite(): void {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    pendingEncodedRef.current = null
  }

  // ---- popstate: ブラウザの戻る/進むで URL から再復元 ----
  // URL を共有対象にする以上、戻る/進むで盤面が同期しないと UX が破綻する。
  // セカンドオピニオン (Gemini / Codex) で両者から強く推奨された対応。
  useEffect(() => {
    if (typeof window === 'undefined') return
    function handlePopState() {
      const param = readUrlParam()

      // 古い pending デバウンス書き戻しを必ず cancel する
      // (LOAD_STATE / RESET 適用後に古い state を URL に書いてしまう race を防ぐ)
      cancelPendingWrite()

      if (param === null) {
        // ?b= が消えた (例: 共有 URL から ?b= なしの URL へ戻った) → 初期状態へ
        // 「URL ↔ state 双方向同期」の責務上、URL が消えたら state も同期させる
        if (lastWrittenEncodedRef.current === encode(INITIAL_BOARD_STATE)) {
          // 既に初期状態と同等。書き込み記録だけ更新して dispatch は不要
          lastWrittenEncodedRef.current = encode(INITIAL_BOARD_STATE)
          return
        }
        lastWrittenEncodedRef.current = encode(INITIAL_BOARD_STATE)
        dispatch({ type: 'RESET' })
        return
      }

      if (param === lastWrittenEncodedRef.current) return

      const decoded = decode(param)
      if (decoded === null) return

      // 自分が書いた直後と区別できるよう、書き込み記録も同時に進める
      lastWrittenEncodedRef.current = param
      dispatch({ type: 'LOAD_STATE', state: decoded })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [dispatch])

  // ---- state 変更時: デバウンスで URL へ書き戻し ----
  useEffect(() => {
    const encoded = safeEncode(board)
    if (encoded === null) return

    // idempotent ガード: 既に同じ内容を書いていれば何もしない
    // (初期 URL ロード直後 / LOAD_STATE 直後 / popstate 直後など全てここで弾ける)
    if (encoded === lastWrittenEncodedRef.current) return

    pendingEncodedRef.current = encoded

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      const toWrite = pendingEncodedRef.current
      if (toWrite === null) return
      // default state と同値なら ?b= を消す (URL を綺麗に保つ)
      writeUrlParam(isInitialEncoded(toWrite) ? null : toWrite)
      lastWrittenEncodedRef.current = toWrite
      pendingEncodedRef.current = null
      debounceTimerRef.current = null
    }, DEBOUNCE_MS)
  }, [board])

  // ---- アンマウント時: 保留中の最新 encoded を同期 flush ----
  // ブラウザナビゲーションで unmount された場合に最新 state を URL に残す。
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      const toWrite = pendingEncodedRef.current
      if (toWrite !== null) {
        writeUrlParam(isInitialEncoded(toWrite) ? null : toWrite)
        lastWrittenEncodedRef.current = toWrite
        pendingEncodedRef.current = null
      }
    }
  }, [])
}
