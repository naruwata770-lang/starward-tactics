/**
 * URL クエリ ↔ 盤面状態の双方向同期 hook。
 *
 * Phase 5 (Issue #6) で導入。
 *
 * 動作:
 * 1. マウント時に `?b=...` から state を復元 (LOAD_STATE)
 * 2. state 変更時にデバウンス (300ms) で `?b=...` を書き戻す
 * 3. ブラウザの戻る/進む (popstate) で URL から再復元
 *
 * 無限ループ防止戦略 (idempotent パターン):
 * - フラグ中心ではなく **encoded 文字列の比較中心** で同期する。
 * - `lastWrittenEncodedRef`: 最後に URL へ書き込んだ encoded 文字列
 * - `lastAppliedEncodedRef`: 最後に URL から state へ適用した encoded 文字列
 * - state → URL: `encode(board)` が `lastWrittenEncodedRef` と一致したらスキップ
 * - URL → state: 現在 URL の `b` が `lastAppliedEncodedRef` と一致したらスキップ
 *
 * Strict Mode の double-invoke でも、同じ encoded 文字列なので何度実行されても
 * 最終結果が同じになる (idempotent)。タイミング依存のフラグより堅い。
 *
 * default state と同値なら `?b=` パラメータ自体を削除する (URL を綺麗に保つ)。
 *
 * SSR ガード: 現状 SSR は使わないが、`typeof window !== 'undefined'` で
 * 念のため早期 return。コスト極小。
 */

import { useEffect, useRef } from 'react'

import { useBoard, useBoardDispatch } from '../state/BoardContext'
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
  // search が空なら URL の `?` も消える (URL クラスの仕様)
  window.history.replaceState(window.history.state, '', url.toString())
}

export function useUrlSync(): void {
  const board = useBoard()
  const dispatch = useBoardDispatch()

  /**
   * 最後に URL へ書き込んだ encoded 文字列。
   * state → URL 方向のループ防止に使う。
   */
  const lastWrittenEncodedRef = useRef<string | null>(null)

  /**
   * 最後に URL から state へ適用した encoded 文字列。
   * URL → state 方向のループ防止に使う。
   */
  const lastAppliedEncodedRef = useRef<string | null>(null)

  /**
   * デバウンス用 timeout の id。アンマウント時 cleanup で flush に使う。
   */
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * デバウンス中の最新 encoded。cleanup で flush するためにも保持しておく。
   */
  const pendingEncodedRef = useRef<string | null>(null)

  // ---- マウント時: URL からの復元 ----
  // deps を [dispatch] にしているが dispatch は安定参照なので 1 回だけ実行される。
  // Strict Mode の double-invoke でも、`lastAppliedEncodedRef` の比較で 2 回目を
  // 弾けるので副作用は冪等。
  useEffect(() => {
    const param = readUrlParam()
    if (param === null) return
    if (param === lastAppliedEncodedRef.current) return

    const decoded = decode(param)
    if (decoded === null) {
      // 不正な URL: 黙って無視 (デフォルト state で起動)
      return
    }

    lastAppliedEncodedRef.current = param
    // 自分が書いた直後に再適用しないよう、書き込み記録も同時に進める
    lastWrittenEncodedRef.current = param
    dispatch({ type: 'LOAD_STATE', state: decoded })
  }, [dispatch])

  // ---- popstate: ブラウザの戻る/進むで URL から再復元 ----
  // URL を共有対象にする以上、戻る/進むで盤面が同期しないと UX が破綻する。
  // 計画書のセカンドオピニオンで両者 (Gemini / Codex) から強く推奨された対応。
  useEffect(() => {
    if (typeof window === 'undefined') return
    function handlePopState() {
      const param = readUrlParam()
      // null になった場合 (b パラメータが消えた) も無視で OK
      // (デフォルト状態に戻す挙動を入れるかは要検討、今回は何もしない)
      if (param === null) return
      if (param === lastAppliedEncodedRef.current) return

      const decoded = decode(param)
      if (decoded === null) return

      lastAppliedEncodedRef.current = param
      lastWrittenEncodedRef.current = param
      dispatch({ type: 'LOAD_STATE', state: decoded })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [dispatch])

  // ---- state 変更時: デバウンスで URL へ書き戻し ----
  useEffect(() => {
    const encoded = encode(board)
    // idempotent ガード: 既に同じ内容を書いていれば何もしない
    // (Strict Mode double-invoke / LOAD_STATE 直後 / popstate 直後など全てここで弾ける)
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

    // cleanup: 次の board 変更でこの effect が再実行されると、上の clearTimeout で
    // 旧タイマーがキャンセルされる。アンマウント時の最終 flush は別 effect で扱う。
  }, [board])

  // ---- アンマウント時: 保留中の最新 encoded を同期 flush ----
  // ブラウザナビゲーションで unmount された場合に最新 state を URL に残すため。
  // [] deps なので unmount 時のみ cleanup が走る。
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
