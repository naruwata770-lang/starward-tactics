# iteration-1 — ベースライン要約 (Phase 5 完了時点)

- **日付**: 2026-04-11
- **対象**: Phase 5 完了時点 (`main` 3c4d6ae を基点)
- **手法**: **AI レビュー fallback** (`.claude/rules/ux-review.md`)
  - Claude (現セッション) が `src/` のコード読解 + `npm run preview` 起動下での手動観察で評価
  - Gemini / Codex による並列レビューは iteration-2 以降の宿題とする (後述)
- **なぜ uxaudit 本家ではなく fallback?**
  - `gotalab/uxaudit` プラグインの **インストールは成功**
    (`claude plugin install uxaudit@gotalab-uxaudit` で user スコープに導入)
  - ただし、すでに起動している Claude Code セッションに mid-session で
    インストールしたため、`/uxaudit:uxaudit` slash command とサブエージェント群
    (`uxaudit-scout` など) が **現セッションには load されない**
    (Claude Code の plugin 読み込みはセッション開始時のみ)
  - iteration-2 ではセッションを起動し直した状態で uxaudit 本家を走らせ、
    このファイルを上書き更新する (`scenario-mode locked` で回帰比較する)
  - 詳細: `.claude/rules/uxaudit.md` の「⚠️ セッション途中でインストールした場合の注意」

---

## 4 失敗パターン判定

| パターン | 判定 | 根拠 |
|---|---|---|
| **伝わらない** | 🟡 該当あり | `index.html` の `<html lang="en">` + `<title>tacticsboard</title>` のまま。初見ブラウザタブには何のアプリか・日本語UIであることすら伝わらない。Toolbar 内の h1 `星の翼 戦術ボード` で初めて名前が出るが、原作ゲームを知らない人向けの補足はない。 |
| **ぼやける** | 🟡 該当あり | InspectorPanel の各 Section が `text-xs uppercase tracking-wider text-slate-400` で装飾が強い一方、**「いま誰を編集しているか」**の視覚的アンカーが弱い。UnitSelector の選択リングは見えるが、画面中央の board と視線を繋ぐラインが無いため、初見で「自機タブ」と「board 上の自機トークン」の対応を見つけるのに一拍かかる。 |
| **見つからない** | 🔴 該当あり (高) | **URL 共有機能の affordance が完全に透明**。`useUrlSync` が state 変更に合わせて `?b=...` を自動更新しているが、UI には 1 ピクセルもサインがない (`Toolbar.tsx` のコメントにも「明示ボタンは不要」と書かれている)。初見ユーザーは「この盤面の共有URLが取れる」という事実を発見できない。 |
| **始まらない** | 🟡 該当あり (中) | 初期表示では `self` が自動選択されていて、Inspector でコスト/覚醒/コア/ロックは触れる状態になっているので「詰む」わけではない。しかし **board 上の unit トークンをクリックしても選択が切り替わらない**ので (Phase 6 の MOVE/SELECT 未着手)、多くの初見ユーザーは最初に盤面をクリックして「何も起きない」と感じる。Inspector の UnitSelector が唯一の入口だという誘導が無い。 |

判定凡例: 🟢 該当なし / 🟡 該当あり (中) / 🔴 該当あり (高)

---

## 高レベル所感

tacticsboard は Phase 5 時点で「4 ユニットのメタ (コスト/覚醒/コア/ロック対象) を
編集しつつ URL で共有する」というコア機能を達成しており、state 管理・型安全・a11y
(コントラスト AA 4.5:1、aria-pressed での toggle 表現、SVG `role="img"` + `<title>`) の
下回りは丁寧に作られている。コメントからも Phase 6 以降の拡張 (ドラッグ/board クリック選択)
に向けた地ならしが意図されていることが読み取れる。

一方で **「初見ユーザーがこの画面を見て何をすれば良いか」** の説明レイヤーが薄い。
Credo 4 原則で言うと「**Orient (自分が何を見ているか伝える)** の弱さ」に集中している。

---

## 重要度別の指摘

### 🔴 高 (フォローアップ Issue で実改修)

1. **`<html lang="en">` を `ja` に修正**
   - 現状: `index.html:2` `<html lang="en">`
   - 影響: WCAG 3.1.1 (Language of Page) fail。スクリーンリーダーが日本語を英語発音で読む。
   - 直し方: `<html lang="ja">` に変更 (1 行修正)

2. **ブラウザタブタイトルの localize**
   - 現状: `index.html:7` `<title>tacticsboard</title>`
   - 影響: タブ一覧から「何のアプリか」が分からない。SNS 共有時のプレビュー (OGP 未設定) も貧弱。
   - 直し方: `<title>星の翼 戦術ボード</title>` に。余力があれば `meta description` と `og:title` / `og:description` も。

3. **URL 共有機能の affordance を作る**
   - 現状: `useUrlSync` で `?b=...` が自動更新されるが、UI 表示なし。
   - 影響: 「見つからない」失敗 (高)。URL が state を持つことが初見では察知不能。
   - 直し方のアイデア (どれか 1 つで十分):
     - Toolbar 右端に「URL をコピー」ボタン (アイコン + tooltip)
     - h1 の横に小さく「この URL を共有すれば盤面が再現されます」の hint
     - アドレスバーフォーカス誘導 (初回 mount 時に 2 秒だけ表示する toast)
   - 既存コメント (`src/components/toolbar/Toolbar.tsx:6-9` の「共有 URL を生成」ボタン
     を置かない判断) は iteration-1 で明確に否定する。

4. **コア種別 (F/S/M/D/B/C) の legend を Inspector に追加**
   - 現状: `CoreTypeSelector.tsx` のボタンは `id` (一文字) のみ表示、`title` 属性で label を hover 時に出す。
   - 影響: 「伝わらない」失敗。初見ユーザーは F = 格闘 / S = 射撃 を知らない (原作ゲーム知識が要る)。
   - 直し方: Section の直下に 1 行の legend (`F=格闘 / S=射撃 / M=機動 / D=防御 / B=バランス / C=カバーリング`)、
     または各ボタンに 1 文字に加えて 1〜2 文字の補助テキストを並べる。

5. **board クリックで unit を選択できない gap の明示**
   - 現状: unit トークンは `<g>` に `<title>` を持つだけ。onClick ハンドラ無し。
   - 影響: 「始まらない」失敗。初見ユーザーは盤面をクリックし「壊れている？」と感じる。
   - 短期の直し方 (Phase 6 まで): board の下に 1 行注記 `「ユニット選択は右パネルから」`、
     もしくは盤面に薄いオーバーレイで「→ Inspector で編集」の誘導。
   - 中期: Phase 6 で `onClick={() => setSelectedUnit(unit.id)}` を UnitToken に付ける (本筋)。

### 🟡 中 (後続 Phase で拾う / Issue 起票は任意)

6. **Board の `role="img"` + `aria-label="戦術ボード"` は SR 的に平坦**
   - 現状: `Board.tsx:37-38`。SVG 全体が「戦術ボード」という一つの画像にまとめられるため、
     スクリーンリーダーは unit ごとの title を drill-down 読み上げしない。
   - 直し方: `role="img"` を外して `role="group"` + `aria-label` に変更し、
     UnitToken 側で `<g role="img" aria-label="..."` + `tabIndex={0}` を持たせる。
   - Phase 6 の drag/select 実装と同時に対応すべき。

7. **InspectorPanel の視覚階層がフラット**
   - 現状: 5 つの Section が等しい `space-y-5` で並ぶ。
   - 直し方: 「編集中ユニット」だけ背景 slate-900 で囲って視線を固定する、
     もしくは UnitSelector の右側に「編集中: 自機」の強調テキスト。

8. **Reset の `window.confirm` は UI トーンと不一致**
   - 現状: `src/components/toolbar/ResetButton.tsx:22`。本体は dark slate-950、confirm はブラウザ既定 (ライト)。
   - `ResetButton.tsx:5` のコメント「MVP として `window.confirm` で十分」で明記されている通り、意図的な設計判断。
   - 直し方は後続 Phase で Modal primitive を作るまで保留で OK。ただし dark モードの OS 設定下でも
     window.confirm が dark になるわけではないので、既存の UI コントラスト設計とのギャップは記録しておく。

9. **初回 / 復元の差分がユーザーに見えない**
   - URL に `?b=...` がある/ない で挙動が変わるが、見た目には差が出ない。復元成功を伝える toast や
     「このURLから復元しました」のバッジがあると安心感が出る。
   - コスト低 (既存 code をほぼ触らず toast を足せば済む)。

10. **モバイル (lg 未満) で Inspector が board の下に積まれる**
    - 現状: `Layout.tsx:36` `flex-col lg:flex-row`。
    - 影響: 小画面で board の縦幅が圧縮される可能性。実測は iteration-2 で viewport=mobile で確認する。

### 🟢 低 (現状は許容)

- favicon は既に custom (`public/favicon.svg`) で Vite 既定ではない。問題なし。
- `meta description` / OGP が無いが SPA で SNS 流入の目的が薄いので急がない。
- StarburstGauge のラベル「なし / 半覚 / 全覚」は日本語ネイティブ向けに十分。ローカライズが必要になったら別 Issue。

---

## iteration-2 以降の宿題

1. **Claude Code を再起動して `/uxaudit:uxaudit tacticsboard --lang ja --viewport desktop` を走らせる**
   — このファイルを上書き、`benchmark.json` / `dashboard.html` / `evidence/` も同じ iteration-1 に残す
   (ディレクトリ上書きで良い。iteration-2 は「`scenario-mode locked` で本物の回帰比較」のために
   取っておく)
2. **自動スクショ pipeline の確立** (uxaudit 本家が自前の `capture.mjs` で持っているのでそれを使う)
3. **Gemini / Codex 並列レビューの実装** — `.claude/rules/ux-review.md` の step 4 を実施
4. **Credo 4 原則との統合 (γ2)** — iteration-1 判定軸がこの 4 パターンだったのを
   Credo 正準化した表現に書き換える
5. **重要度「高」の 1〜5 を実改修する UX 改善 Issue を起票**

---

## 関連

- 依頼 Issue: `#18 uxaudit 導入 spike: iteration-1 ベースライン取得と fallback 検証`
- 並列 Issue: `#19 α Credo 4 原則` / `#17 β シナリオ先行`
- 運用統合 (後追い): γ2 「uxaudit 運用統合 (git-workflow / CLAUDE.md / README)」
- インストールログ: このディレクトリ内 `install-log.md`
- fallback プロトコル: `.claude/rules/ux-review.md`
- 本プラグインのルール: `.claude/rules/uxaudit.md`
