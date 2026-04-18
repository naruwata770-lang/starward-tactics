# uxaudit iteration-3 summary

| 項目 | 値 |
|---|---|
| 対象 PR | [#85](https://github.com/naruwata770-lang/starward-tactics/pull/85) (Issue #84: TeamCostBar 配置見直し) |
| 実行日 | 2026-04-18 |
| ツール | 手動デルタ判定 (iteration-2 baseline からの差分のみ) |
| URL | http://localhost:5173 (vite dev) |
| Viewport | desktop (1440×900) + narrow (390×844) |
| Scenario mode | N/A (差分判定のため plugin 本体 run は見送り) |
| baseline | iteration-2 (PR #68 / Issue #60 チーム残コスト機能追加時) |

## 本 iteration の位置づけ

本 PR は **新規 UI 要素の追加なし / レイアウト再編のみ** のため、plugin 本家の
全 40 checks を再実行する必要性が低い。iteration-2 で fail / unverifiable と
判定された論点が本変更で「改善した / 後退した / 変わらず」のどれに該当するかを
手動判定する差分アプローチを採る。完全な回帰比較は次回 UI 追加時 (iteration-4
以降) に `/uxaudit:uxaudit --scenario-mode locked` で実施する。

## 変更内容 (要約)

1. `TeamCostBar` を `Layout` の `toolbar` slot (header 内) から新設 `costBar` slot
   (main 内 board 直下) に移動
2. main の縦整列を `items-center` → `items-start` に変更 (cost bar が viewport 外に
   落ちる副作用の回避)
3. Layout slot API を 3 → 4 に拡張し、`Layout.test.tsx` で契約を固定

## 4 失敗パターン判定 (iteration-2 との差分)

| パターン | iter-2 判定 | iter-3 判定 | 根拠 |
|---|---|---|---|
| 伝わらない | 該当なし | 該当なし (維持) | タイトル / 4 機ラベル / Inspector ドメイン語彙は無変更 |
| ぼやける | 該当あり (中) | **該当あり (軽微改善)** | header が Toolbar 単独に戻り 1 段高に収まったため上部の視覚密度が下がる。primary CTA 不在 / 既定色の問題は残存 (本 PR 範囲外) |
| 見つからない | 該当なし | 該当なし (維持) | cost bar は board 直下に移ったが Inspector との導線は維持。新規 fail なし |
| 始まらない | 該当なし | 該当なし (維持) | FTUE 0 クリック到達を維持 |

## Issue #84 の主目的達成度

計画書で定義した **「盤面と残コスト表示の視線距離最短化」** の定量判定:

| 項目 | iter-2 (PR #68) | iter-3 (PR #85) | 改善 |
|---|---|---|---|
| board 中心 y 座標 (desktop 1440×900) | ~490px (header + main 中央) | ~425px (header + main 上寄せ) | -65px |
| cost bar y 座標 | 48px (header 内) | 793px (board 下) | +745px |
| board 下端 → cost bar 上端 | -442px (cost bar が board より上) | **+8px (board 直下で隣接)** | 視線移動の方向が「上に戻る」から「下にわずかに降りる」に |
| 両者 viewport 内同居 (1440×900) | ❌ (cost bar は header 内で固定、スクロールで離れる) | ✅ (8px gap で常に隣接) | 新規達成 |

視線距離は「cost bar は常に header (上) / board は下半分」という分断構造から、
「cost bar は board の真下 8px」に変化。Core Loop (駒操作 → 残コスト確認) の眼球
移動が短縮された。

## Credo 4 原則判定 (差分のみ)

| 原則 | iter-2 判定 | iter-3 判定 | 根拠 |
|---|---|---|---|
| Core First, Polish Later (ぼやける) | △ | △ (維持 + 軽微改善) | visual-hierarchy 問題は残るが header 再整理で上部が締まった。primary CTA 不在は本 PR 範囲外 |
| Core First, Polish Later (始まらない) | ✅ | ✅ (維持) | FTUE 無変更 |
| Wire Before You Decorate | ✅ | ✅ (強化) | Layout smoke test (`src/__tests__/Layout.test.tsx`) で 4 slot API を機械的に固定 |
| No Dead Code | ✅ | ✅ (維持) | 前コミットで冗長だった `items-center` / 旧 header 内の束ね構造を削除 |
| Spec is the default, user evidence overrides spec | N/A | ✅ (本 PR で適用) | Issue #60 の判断を稼働後の UX 観察に基づき巻き戻した典型事例 |

## 副作用と受容根拠

`items-center → items-start` 変更により tall viewport (Inspector 短く main が縦に
余るケース) で board+costBar が header 直下に貼り付き、下部に空白が出る副作用が
ある。これは cost bar が viewport 外に落ちる副作用 (情報損失) より軽微 (視覚的
違和感のみ) と判断し受容。受容根拠は [Layout.tsx の JSDoc](../../../src/components/Layout.tsx)
に恒久記録。

## 既存の aside stretch 問題 (本 PR 範囲外)

aside (Inspector) が tall なため main を flex-row stretch で縦に伸ばし、viewport
超過時はページ全体がスクロールする既存挙動は本 PR で解消しない。short viewport
で cost bar が board の直下 (y=793) のままだと viewport 600h では fold below に
なる。解消には outer を `h-svh` + aside 内部スクロールに切り替える layout 哲学の
変更が必要で、本 Issue の範囲外。必要になれば別 Issue で扱う。

## evidence

視覚検証は Claude Preview MCP でレイアウト測定 (`preview_eval`) + スクリーンショット
確認を行った。plugin 本家 run を見送ったため生画像は `evidence/` に残していない。
主要な測定値は本 summary 上部の「主目的達成度」表に定量記録してある。

再現手順:
1. `npm run dev` で http://localhost:5173 に起動
2. viewport 1440×900 で board 中心の y 座標、cost bar y 座標を DevTools で確認
3. `items-start` 化により board y=65, cost bar y=793, gap=8px が再現できればよい

## 参考: 完全 plugin 実行の実施タイミング

次回 UI 追加時 (例: primary CTA デザイン決定、色調整など) に
`/uxaudit:uxaudit tacticsboard --lang ja --scenario-mode locked` を実行し、
iter-2 のジャーニー契約で自動回帰比較する。
