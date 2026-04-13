# uxaudit iteration-2 summary

| 項目 | 値 |
|---|---|
| 対象 PR | #68 (Issue #60: チーム残コスト) |
| 実行日 | 2026-04-13 |
| ツール | `/uxaudit:uxaudit` (plugin `gotalab-uxaudit@0.1.0`) |
| URL | http://localhost:5190 (vite dev) |
| Viewport | desktop (1440×900) |
| Scenario mode | hybrid (default) |
| Raw artifacts | `.agents/uxaudit/tacticsboard/iteration-1/` (gitignore、生 artifact 40 checks / 8 journeys) |
| 合計 | 40 checks: ✅ 26 pass / ❌ 10 fail / ❓ 4 unverifiable |

iteration-1 は spike fallback (AI レビュー) のスナップショットで、iteration-2 が plugin 本家の初回完全実行。回帰比較 (`scenario-mode locked`) は iteration-3 以降に有効化する (両 iteration の測定軸が異なるため 1→2 の diff は参考値)。

## 4 失敗パターン判定

| パターン | 判定 | 根拠 (plugin L3/L4 verdict から抽出) |
|---|---|---|
| 伝わらない | 該当なし | `core-experience/value-prop-clarity` pass — 「星の翼 戦術ボード」タイトル + 4 機ラベル + Inspector ドメイン語彙で 5 秒判定可能 |
| ぼやける | 該当あり (中) | `usability/visual-hierarchy` fail — primary CTA が不在で Undo/Redo/Reset/Share/PNG が同格に並ぶ。`desirability/aesthetic-first-impression` fail — Tailwind 既定色そのままで "bespoke" 感に乏しい |
| 見つからない | 該当なし | `usability/empty-state-guidance` pass。TeamCostBar は Toolbar 直下で発見容易 (L4 journey 3 first-run-understand で first_value 3 シグナルを 001.png で確認) |
| 始まらない | 該当なし | `usability/first-time-user-experience` (FTUE) pass — 0 クリックで第一価値 (盤面 + Inspector + バー) に到達、login/cookie/モーダル一切なし |

## Credo 4 原則判定 (第二階層)

| 原則 | 判定 | 根拠 |
|---|---|---|
| Core First, Polish Later (ぼやける) | △ | visual-hierarchy fail が残る。ただし Issue #60 のチーム残コスト機能は core flow (quiz 画像共有) の必須情報なので、装飾ではなく core の一部として追加したのは正しい判断 |
| Core First, Polish Later (始まらない) | ✅ | FTUE 0 クリック到達を維持 |
| Wire Before You Decorate | ✅ | TeamCostBar + Inspector + URL 同期 + PNG 合成まで vertical slice が end-to-end で通っている (手動検証で確認済み) |
| No Dead Code | ✅ | Issue #60 の追加ファイルはすべて配線済み。未使用 export / disabled placeholder なし |
| Spec vs Evidence | ✅ | 計画書の検証シナリオ (URL 復元 / v1 互換 / 境界 disabled / Reset) はすべて手動で確認。シナリオに書いていない "visual feedback 不在" の共有ボタン問題は既存仕様由来 (Issue #60 スコープ外) |

## Issue #60 スコープの主な所見

### 実装は機能する

Proposer が最重要 root cause として挙げた **"残コスト ± ボタンと URL 共有ボタンが動かない"** は、Issue #60 スコープでは **capture_journey.mjs の DOM-change タイミング検出の false positive**。HTML 差分で検証すると:

- `002.html`: `team-remaining-cost-ally">6.0/6.0`
- `003.html` (`味方 −0.5` クリック後): `team-remaining-cost-ally">5.5/6.0`

frame_hash も `8bac785efa94 → 339ba0053fed` と変化しており、ピクセルも DOM も変わっている。`capture_journey.mjs` が `expect_change.kind=dom, timeout_ms=5000` で待っている DOM 変化条件が、`memo` 化された SVG バーの shallow diff に対して厳格すぎた可能性が高い。

ブラウザ手動検証 (PR #68 の Test plan) では ± ボタン → URL 反映 → 別タブ復元 → Reset の core flow が通っている。

### 共有ボタンの feedback 不在は既存問題

`share-or-export` journey の fail は **Phase 10 で追加された ShareButton の挙動** (クリップボードに URL をコピーして UI 変化なし) が根本原因。Issue #60 の変更は触れていない。別 Issue として起票候補:

- クリック後 2 秒だけ「✓ コピー」表示に切り替え
- もしくはトースト表示

## 主要な fail とそのスコープ

| check_id | 判定 | Issue #60 関連 | 対応優先度 |
|---|---|---|---|
| `core-experience/primary-journey (adjust-team-remaining-cost)` | fail | **tooling false positive** (HTML/ピクセル共に変化あり) | — |
| `core-experience/primary-journey (share-or-export)` | fail | 既存 ShareButton の feedback 不在 | 別 Issue |
| `usability/visual-hierarchy` | fail | 既存。primary CTA 不在 | 別 Issue (UI 改善) |
| `desirability/aesthetic-first-impression` | fail | 既存。Tailwind 既定色 | 別 Issue |
| `desirability/delight-moments` | fail | 既存。演出なし | 低優先 |
| `ai-slop/default-tailwind-palette` | fail | 既存。`theme.extend.colors` 未設定 | 別 Issue |
| `ai-slop/generic-font-stack` | fail | 既存。`system-ui` のみ | 低優先 |
| `accessibility/axe-core` | fail | 既存。color-contrast 13 件 / nested-interactive 1 件 | 別 Issue (a11y) |
| `accessibility/font-hierarchy` | fail | 既存。h1=18px が body=16px に近すぎる | 別 Issue |
| `accessibility/heading-skip-levels` | fail | 既存。level skip 1 件 | 別 Issue |

**Issue #60 のスコープ内で対応が必要な fail はゼロ**。他は既存のベースライン課題。

## unverifiable

| journey | 原因 |
|---|---|
| `edit-unit-attributes` | Compiler が「既に選択中の自機ボタン」を再クリックして no-state-change (既存の自機選択が default 状態、Compiler が想定していなかった) |
| `position-units-on-board` | 同上 + ドラッグ操作が Playwright で再現不能 (non_fakeable_skips) |
| `undo-redo-iterate` | step 3 の自機ボタン再クリックで停止 |
| `usability/feature-consistency` | feature-scope モード専用 check (今回は whole-app 運用なので N/A) |

`edit-unit-attributes` / `position-units-on-board` / `undo-redo-iterate` の 3 件は **journey-script の開始状態仮定が「自機未選択」であるべきところを plugin が誤って「自機選択済み」状態で開始** した不具合。iteration-3 で Compiler を再 healing する。

## フォローアップ

- [ ] (別 Issue) ShareButton に視覚フィードバック (トースト or ラベル切替) を追加
- [ ] (別 Issue) primary CTA を明確化 (visual-hierarchy 対応)
- [ ] (別 Issue) Tailwind theme にブランドアクセント色を 1 色追加 (`default-tailwind-palette` / `aesthetic-first-impression`)
- [ ] (別 Issue) `axe-core` の color-contrast / nested-interactive を修正
- [ ] (別 Issue) 見出し階層 (h1/h2 サイズ差 + level skip)
- [ ] iteration-3 で journey-script の初期状態 (自機未選択) を Compiler に教えて unverifiable 3 件を潰す

## plugin 挙動メモ (将来のイテレーション向け)

| 事象 | 原因 | 回避策 |
|---|---|---|
| `python3 -c` が失敗 | Windows Store の shim が空出力 | `.tmp/bin/python3` → 本物 python 3.10 の wrapper を PATH 先頭に |
| `UnicodeDecodeError: cp932` | Windows デフォルトエンコーディング | `PYTHONUTF8=1` を全シェルで export |
| `ERR_MODULE_NOT_FOUND: playwright` | ESM が NODE_PATH を無視 | `$UXAUDIT_DIR/node_modules` に junction (`mklink /J`) で plugin data の node_modules をつなぐ |
| `ModuleNotFoundError: fcntl` (generate_dashboard.py) | POSIX-only モジュール | dashboard.html は生成せず、`benchmark.json` + 本 summary で代替 |
| L4 `adjust-team-remaining-cost` false-positive | `capture_journey.mjs` の DOM-change 検出が `memo(SVG)` の差分を拾えない | 今回はスコープ外扱い (raw frame_hash と HTML は変化) |
