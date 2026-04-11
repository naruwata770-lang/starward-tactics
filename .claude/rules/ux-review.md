# UX レビュー (AI レビュー fallback)

uxaudit プラグイン (`gotalab/uxaudit`) が動かない / セッション途中で install した直後で
slash command が load されていない / 軽量な一次チェックだけ欲しい、などの理由で
自動 uxaudit を走らせたくない場合の fallback プロトコル。`/ask-others` の派生として
Claude + Gemini + Codex に UX レビューを委ねる。

## 前提

- `gemini --version` と `codex --version` が両方通ること (ローカル開発環境)
- Credo 4 原則 (α: `.claude/rules/credo.md`, γ2 で追加予定) と
  **4 失敗パターン**「伝わらない／ぼやける／見つからない／始まらない」を判定軸にする
- 本プロジェクトは Japanese UI。レビューも日本語で依頼する

## フロー

### 1. 対象ビルド + 起動

```bash
npm ci
npm run build
PORT=4173 npm run preview &
```

停止は `kill %1` でも `npm run preview` の PID を `taskkill` でも良い。
`.tmp/` は gitignore 済みなので、一時ファイルはそこに置く。

### 2. スクショを撮る (手動)

ブラウザで `http://localhost:4173` を開き、最低でも次の画面を png で保存する
(保存先: `docs/uxaudit/iteration-<N>/screenshots/`):

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

`.tmp/ux-review-prompt.txt` に以下を書き出す (`Write` ツール):

```
あなたはシニア UX リサーチャーです。添付スクショ (iteration-<N>) を見て
次の 2 階層で UX をレビューしてください。

【第一階層: 4 失敗パターン】
- 伝わらない: 画面を見て何のアプリか・何を操作しているかが読み取れない部分
- ぼやける: 大事な要素と装飾の優先順位が付かない部分
- 見つからない: 欲しい機能が画面上で見つからない部分
- 始まらない: 初見ユーザーが最初のアクションに詰まる部分

各項目について「該当あり / 該当なし / どちらとも言えない」で判定し、
該当ありならスクショ番号と根拠を添える。

【第二階層: Credo 4 原則】
(.claude/rules/credo.md を参照してください — このリポジトリ内にあります)

【出力フォーマット】
## 4 失敗パターン判定
| パターン | 判定 | 根拠 |

## Credo 4 原則判定
| 原則 | 判定 | 根拠 |

## 重要度別の具体指摘
### 高
- ...
### 中
- ...
### 低
- ...

## 総評 (3 行以内)

日本語で回答してください。
```

### 4. Gemini / Codex に並列で投げる

**Gemini CLI** は画像パスを直接読めないため、スクショは「ファイルパスと
テキスト説明」を貼るか、ファイル内容を base64 化して直接埋め込むかの
どちらかで渡す。spike 段階では **テキストベースの画面記述 + Claude 側の
スクショ観察** を優先する (完全な自動画像パイプは γ2 で検討):

```bash
# Gemini (バックグラウンド)
cat .tmp/ux-review-prompt.txt | gemini
```

```bash
# Codex (バックグラウンド, 長時間対応)
cat .tmp/ux-review-prompt.txt | codex exec --sandbox read-only -
```

両方ともプロジェクト内の `.claude/rules/credo.md` を自律的に読めるはずなので、
プロンプト本体は引数コマンドに依存させない (`/review` スキルと同じ作法)。

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
