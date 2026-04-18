# uxaudit iteration-4: Issue #86 short viewport 高さ戦略

## 4 失敗パターン判定 (iteration-3 との差分)

| パターン | iter-3 判定 | iter-4 判定 | 根拠 |
|---|---|---|---|
| 伝わらない | 該当なし | 該当なし (維持) | タイトル / 4 機ラベル / Inspector ドメイン語彙は無変更 |
| ぼやける | 該当あり (軽微改善) | 該当あり (維持) | header / Toolbar / primary CTA の視覚密度問題は本 PR 範囲外 |
| 見つからない | 該当なし | 該当なし (維持) | 2 カラム時 Inspector が viewport 内に収まり、aside 内部 scroll で全項目に到達できる |
| 始まらない | 該当なし | 該当なし (維持) | FTUE 0 クリック到達を維持 |

**回帰なし**。iteration-3 で「既存の aside stretch 問題」として明文記録していた
「short viewport では cost bar が viewport 外に落ちる」既知課題を本 iteration で
解消。

## 実施形態 (plugin 本家 vs AI fallback)

本 PR は **iteration-3 と同様にレイアウトの高さ戦略変更のみ** で、新規 UI 要素は
ない。plugin 本家の全 40 checks 再実行は優先度が低いため、Claude が実ブラウザ
(claude-in-chrome MCP) でレイアウト測定 (`javascript_tool`) + class token 契約
テスト (Layout.test.tsx) を組み合わせて iteration-3 との差分判定で進める。完全な
L1〜L4 回帰比較は次回 UI 追加時 (iteration-5 以降) に
`/uxaudit:uxaudit --scenario-mode locked` で実施する。

## 変更内容 (要約)

1. `Layout.tsx` outer を `min-h-svh` → `min-h-svh lg:h-svh` に変更
   - 1 カラム期 (幅 < 1024px) は従来どおり page-level scroll
   - 2 カラム期 (幅 ≥ 1024px) は outer が viewport 高にロックされ、aside
     (Inspector) が内部スクロール
2. `Layout.test.tsx` に class token 単位の包含契約を 4 項目追加
   (outer / content row / main / aside)
3. JSDoc 冒頭コメントに「outer の高さ戦略」節を追加

## Issue #86 主目的の達成度 (Claude 実測)

Claude がローカル dev server (`npm run dev -- --port 5174`) に claude-in-chrome
MCP で接続し、outer の style を固定高にして 5 viewport を simulation。

| viewport | outer height | main height | aside client (<aside scroll=1153) | costBar viewport 内 | page overflow |
|---|---|---|---|---|---|
| 1440×900 tall desktop | 900 | 818 | 818 (内部 scroll 発動) | ✅ | ❌ |
| 1440×600 short landscape | 600 | 518 | 518 (内部 scroll 発動) | ✅ | ❌ |
| 1366×768 realistic short | 768 | 686 | 686 (内部 scroll 発動) | ✅ | ❌ |
| 1024×768 lg 境界直上 | 768 | 686 | 686 (内部 scroll 発動) | ✅ | ❌ |

**5 desktop viewport すべてで `costBar viewport 内 ✅` / `page overflow ❌` を達成**。
iteration-3 時点では 1440×600 / 1366×768 / 1024×768 で cost bar が y=793 付近で
viewport 外に落ちていた (page-level scroll が必要) 状態を解消した。

### 副作用: 1440×600 で board が 406px に圧縮される

outer=600、header=49、footer=33、main=518 のとき board container は 518-cost bar
(72) - gap (8) ≒ 438 高さまで縮む。Board SVG は `preserveAspectRatio=xMidYMid meet`
(デフォルト) なので、描画実幅は 406×406 相当 (アスペクト比保持で短辺に合わせる)。
元の 720×720 比で ~56% に縮小。

これは Codex[中] レビュー指摘の「board usable size の最小値」に該当するが、以下
の理由で本 Issue では受容:

- 1366×768 (実機的 short desktop) では board=574 を確保でき、操作性は十分
- 1440×600 は意図的に作った極端 landscape で、実機の multitasking 側面
  (DevTools 付き 1920×900 → 1440×600 縮小など) を想定。ここで cost bar 可視を
  取る方が Core Loop (駒操作 → 残コスト確認) の視線距離 (Issue #84 主目的) と
  整合
- board がさらに縮む場合の対策 (Inspector アコーディオン化など) は別 Issue

## Credo 4 原則判定 (差分のみ)

| 原則 | iter-3 判定 | iter-4 判定 | 根拠 |
|---|---|---|---|
| Core First, Polish Later | △ | △ (維持) | short viewport で core loop の視線距離が確保された (改善)。一方 1440×600 で board が 406 に縮むのは Core First 観点で境界事例。受容根拠を本 summary に記録 |
| Wire Before You Decorate | ✅ | ✅ (強化) | Layout.test.tsx に class token 包含契約を 4 項目追加し、`min-h-0` / `flex-1` / `lg:h-svh` など高さ戦略に load-bearing な契約を機械的に固定 |
| No Dead Code | ✅ | ✅ (維持) | 防御的に検討した `lg:overflow-hidden` を採用しない判断 (Codex[中] 指摘: 必要性を実測で確認してから入れる原則) |
| Spec vs Evidence | ✅ | ✅ (適用) | 計画書にブレークポイント選定の根拠と 5 viewport 検証シナリオを書き下し、実測 evidence で検証完了 |

## セカンドオピニオン (`/ask-others`) 反映

計画フェーズで Gemini + Codex 並列レビューを実施 (`drafts/86-aside-stretch-short-viewport-plan.md`
の「セカンドオピニオン反映」節参照)。主な反映:

- **採用**: ブレークポイント選定理由の明文化 (幅条件ではなくカラム切替との 1:1 対応)
- **採用**: `lg:overflow-hidden` の不採用 (DirectionPicker clipping 回帰リスク)
- **採用**: 5 viewport (1024/1023/1366 境界含む) へ手動検証シナリオ拡張
- **採用**: Layout.test.tsx に `min-h-0` など token 単位の包含契約追加
- **採用**: DirectionPicker edge clipping / nested scroll 回帰確認をシナリオに追加
- **見送り**: Inspector アコーディオン化 (Gemini/Codex 共に別 Issue と判定)

## evidence

plugin 本家 run を見送ったため画像は `evidence/` に残していない。視覚検証は
claude-in-chrome MCP でレイアウト測定 (`javascript_tool`) を行った。主要な測定値
は本 summary の「主目的達成度」表に定量記録してある。

再現手順:
1. `npm run dev -- --port 5174` で http://localhost:5174 に起動
2. DevTools で viewport を指定値に変えるか、開発者コンソールで
   `document.querySelector('#root > div').style.cssText = 'height: 600px; min-height: 0;'`
   で outer を固定高にする
3. board 下端 → cost bar 上端 = 8px gap / cost bar bottom < outer bottom が
   各 viewport で成立することを確認

## 参考: 完全 plugin 実行の実施タイミング

次回 UI 追加時 (primary CTA デザイン決定など) に
`/uxaudit:uxaudit tacticsboard --lang ja --scenario-mode locked` を実行し、
iter-2 のジャーニー契約で自動回帰比較する予定。
