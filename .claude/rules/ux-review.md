# UX レビュー (AI レビュー fallback)

uxaudit プラグイン (`gotalab/uxaudit`) が動かない / セッション途中で install した直後で
slash command が load されていない / 軽量な一次チェックだけ欲しい、などの理由で
自動 uxaudit を走らせたくない場合の fallback プロトコル。`/ask-others` の派生として
Claude + Gemini + Codex に UX レビューを委ねる。

## 前提

- `gemini --version` と `codex --version` が両方通ること (ローカル開発環境)
- **判定軸は 2 階層**:
  - **第一階層: 4 失敗パターン**「伝わらない／ぼやける／見つからない／始まらない」 — `.claude/rules/uxaudit.md` 末尾の定義を参照
  - **第二階層: Credo 4 原則** (Core First / Wire Before Decorate / No Dead Code / Spec vs Evidence) — `.claude/rules/credo.md` を参照。4 失敗パターンとの対応は `.claude/rules/uxaudit.md` の対応表を参照
- 本プロジェクトは Japanese UI。レビューも日本語で依頼する

## フロー

### 1. 対象ビルド + 起動

```bash
npm ci
npm run build
npm run preview &
```

`npm run preview` は `package.json:13` で `vite preview` そのままなので、
ポートは **vite のデフォルトである 4173 固定**。環境変数 `PORT` は効かないため、
他のポートで立てたいときは `npm run start` (`vite preview --host 0.0.0.0 --port ${PORT:-4173}`)
を使う。停止は Windows Git Bash なら `taskkill //F //IM node.exe` が確実
(`kill %1` は jobspec と vite プロセスの PID が一致せず効かないことがある)。
`.tmp/` は gitignore 済みなので、一時ファイルはそこに置く。

### 2. スクショを撮る (手動)

ブラウザで `http://localhost:4173` を開き、最低でも次の画面を png で保存する
(保存先: `docs/uxaudit/iteration-<N>/evidence/` — uxaudit 本家の `evidence/`
と命名を揃えて、将来 plugin 経由で吐かせた自動スクショと混ぜやすくする):

| ファイル名 | 場面 |
|---|---|
| `01-initial.png` | 初期表示 (復元なしで立ち上げた直後) |
| `02-select-ally.png` | Inspector で「相方」を選択した状態 |
| `03-change-cost.png` | コスト or 覚醒 or コアを変更した後 |
| `04-after-undo.png` | Undo ボタンを押した直後 |
| `05-reset-confirm.png` | Reset ボタンを押した瞬間 (confirm 表示中) |
| `06-shared-url-restore.png` | 別タブで現在 URL をコピペして復元した状態 |
| `07-mobile-narrow.png` | viewport を 390×844 に縮めた状態 |

撮り方の目安: DevTools の「デバイスツールバー」で viewport を変えられる。
png は 5 MB/iteration を超える場合は `docs/uxaudit/iteration-<N>/` 直下の
`summary.md` に「原本はローカル保管」と書いて `.gitignore` で除外する。

### 3. レビュー依頼プロンプトを一時ファイルに書く

Gemini CLI / Codex CLI は画像パスを直接解釈しないため、スクショは `evidence/`
相対パスとは別に **各画面の観察メモ (何を操作した結果の画面か / どこに目が行くか /
気づいた違和感)** をテキストで appendix に貼る必要がある。これを抜かすと
「Credo 4 原則判定」セクションが推測で埋まってしまう。

`.tmp/ux-review-prompt.txt` に以下を書き出す (`Write` ツール):

```
あなたはシニア UX リサーチャーです。以下の appendix に貼られた iteration-<N> の
スクショ観察メモを読み、次の階層で UX をレビューしてください。

【判定軸: 4 失敗パターン】
- 伝わらない: 画面を見て何のアプリか・何を操作しているかが読み取れない部分
- ぼやける: 大事な要素と装飾の優先順位が付かない部分
- 見つからない: 欲しい機能が画面上で見つからない部分
- 始まらない: 初見ユーザーが最初のアクションに詰まる部分

各項目について「該当あり / 該当なし / どちらとも言えない」で判定し、
該当ありならスクショ番号と根拠を添える。

【判定軸: Credo 4 原則 (第二階層)】
`.claude/rules/credo.md` の 4 原則を UX の観点でも問う:
- Core First, Polish Later: core flow が最短で触れる状態か？装飾が core を遅らせていないか？
- Wire Before You Decorate: UI 部品が vertical slice として end-to-end で動いているか？
- No Dead Code: 使われていない UI 要素・到達不能な画面がないか？
- Spec vs Evidence: 検証シナリオを満たしつつ、実際に触った感触が良いか？

4 失敗パターンと Credo 4 原則の対応は `.claude/rules/uxaudit.md` 末尾を参照。

【出力フォーマット】
## 4 失敗パターン判定
| パターン | 判定 | 根拠 |

## 重要度別の具体指摘
### 高
- ...
### 中
- ...
### 低
- ...

## 総評 (3 行以内)

日本語で回答してください。

---

【appendix: スクショ観察メモ】

## 01-initial.png  (docs/uxaudit/iteration-<N>/evidence/01-initial.png)
- 何を操作したか: (例) 復元なしで http://localhost:4173 を開いた直後
- 画面構成: (例) Header に "星の翼 戦術ボード" + Undo/Redo/Reset、中央に盤面 SVG、右に InspectorPanel
- 初見で目が行く場所: ...
- 気づいた違和感: ...

## 02-select-ally.png
...

(以下 07-mobile-narrow.png まで同様に貼る)
```

appendix 部分は **人間 (または Claude) が実際にスクショを見て書く**。
この appendix を抜かすと Gemini/Codex は画面を見ないまま推測でレビューするので、
再現不能な fallback になる (review #18 の codex 指摘を参照)。

### 4. Gemini / Codex に並列で投げる

両 CLI とも長時間推論になり得るため、**Bash ツールの `run_in_background: true`
(または `&` 末尾) で並列起動する**。/review スキルと同じ作法:

```bash
# Gemini (run_in_background: true で並列起動)
cat .tmp/ux-review-prompt.txt | gemini
```

```bash
# Codex (run_in_background: true + timeout 300000 を推奨)
cat .tmp/ux-review-prompt.txt | codex exec --sandbox read-only -
```

両方ともプロジェクト内のファイルを自律的に読めるので、プロンプト本体は
引数コマンドに依存させない (`/review` スキルと同じ作法)。

### 5. Claude (現セッション) 側のレビュー

Claude 自身は Chrome MCP か Read ツールで画面を観察し、同じフォーマットで
レビューを書き出す。3 者の結果を統合して `docs/uxaudit/iteration-<N>/manual-ai.md`
に保存する (`[共通]` タグで 2 人以上が指摘した項目をマーク)。

最終的な人間向け要約は `docs/uxaudit/iteration-<N>/summary.md` に書く。
このとき 4 失敗パターンの判定は冒頭に必ず置く (`.claude/rules/uxaudit.md` 参照)。

## uxaudit 本家との違い

| 観点 | uxaudit 本家 | この fallback |
|---|---|---|
| L1 (静的カタログ) | axe-core / AI slop 辞書で自動検出 | Claude/Gemini/Codex が目視判定 |
| L2 (Nielsen 10 原則) | ルールベース + 一部 LLM | 3 者が主観レビュー |
| L3 (スクショ judge) | pixel-only judge サブエージェント | 人間 + LLM の合議 |
| L4 (ジャーニー実行) | Playwright で自動 traverse | 手動スクショ + 人間説明 |
| ジャーニー発見 | Scout エージェントが自動推定 | 人間が #2 のリストを手書き |
| 回帰比較 | `scenario-mode locked` で自動 | `docs/uxaudit/iteration-<N-1>` を目視 diff |

つまりこの fallback は「検証文化を残すための最低限のセーフティネット」であり、
**精密な回帰検出は uxaudit 本家が動く状態に戻った時点で乗り換える** 想定。

## ⚠️ リモート環境では使えない

`/ask-others` と同じく、この fallback は Gemini CLI + Codex CLI が認証済みで
インストールされている **ローカル開発環境専用**。Claude Code GitHub 連携
(スマホアプリ経由のリモート起動など) からは動かない。リモートでは PR コメント経由で
人間レビューを頼む、あるいは uxaudit プラグインが動くマシンで別途 iteration を回す。
