---
name: review
description: サブエージェントによるコードレビューを実施。変更内容の品質・セキュリティ・保守性を確認する。「レビュー」「コードレビュー」「review」「レビューサイクル」などのキーワードで自律的に使用。
---

# コードレビュースキル

サブエージェント（Claude）、Gemini CLI、Codex CLIを並列で使用し、複数の視点からコードレビューを実施する。

## 前提

- [review-guidelines.md](review-guidelines.md) - レビュー観点・基準
- [review-checklist.md](review-checklist.md) - レビュー項目チェックリスト
- Gemini CLIがインストール・認証済みであること（`gemini --version`で確認）
- Codex CLIがインストール・認証済みであること（`codex --version`で確認）

## 使用タイミング

以下の場合に**自律的に**このスキルを使用すること：

- 機能実装が完了したとき
- mainブランチへのマージ前
- ユーザーから「レビューして」と依頼されたとき
- 「このプロジェクトのルールに従って」と言われ、実装が完了したとき

## 実行手順

### 1. レビュー対象の特定

以下の優先順位でレビュー対象を判定する：

**1a. PR番号が引数で指定された場合（例: `/review !1`）**

```bash
gh pr view <PR番号>
gh pr diff <PR番号>
```

**1b. 現在のブランチにオープンな PR がある場合**

```bash
gh pr list --head $(git branch --show-current)
```

PR が見つかった場合は `gh pr diff <PR番号>` で差分を取得する。
ロックファイルなどノイズが多い場合は、`git fetch origin main && git diff origin/main..HEAD -- . ':!package-lock.json'` のような pathspec で除外する。

**1c. PR がない場合（ローカル変更のレビュー）**

```bash
git diff --cached --name-only
git diff --name-only
git ls-files --others --exclude-standard
git diff HEAD~1 --name-only
```

対象の判定基準：
- ステージング済みの変更がある場合 → ステージング済みの変更をレビュー
- 未ステージングの変更のみの場合 → 未ステージングの変更をレビュー
- いずれもない場合（コミット直後） → 直近のコミットの変更をレビュー

### 2. 変更内容の取得

**PR の場合:**

```bash
gh pr diff <PR番号>
```

**ローカルの場合:**

```bash
git diff --cached -- <ファイル名>
git diff -- <ファイル名>
git diff HEAD~1 -- <ファイル名>
```

新規ファイルの場合はReadツールで直接読み込む。

### 3. レビュープロンプトを一時ファイルに書き出す

**重要: hook 誤検出回避のため、プロンプトと diff は必ず一時ファイル経由で渡すこと。**
インライン引数やヒアドキュメントで渡すと、プロンプト内容が deny-check hook に検査され、誤ブロックされる場合がある。

Write ツールで `.tmp/review-prompt.txt` に以下のフォーマットで書き出す：

```
以下のコード変更をレビューしてください。

【観点】
- 正確性: 仕様通りに動作するか、エッジケース対応
- セキュリティ: 入力検証、認証認可、機密情報漏洩
- 保守性: 可読性、命名、責務分離、テスト容易性
- パフォーマンス: 不要な計算、再レンダリング、メモリリーク
- 一貫性: コーディング規約、既存パターンとの整合

詳しい観点・チェック項目は .claude/skills/review/review-guidelines.md と
.claude/skills/review/review-checklist.md を参照してください。
（両 CLI ともワーキングディレクトリ内のファイルを自律的に読めます）

問題点があれば重要度（高/中/低）で分類して指摘してください。日本語で回答してください。

---

【変更対象】
<ファイルパス一覧>

【差分】
<git diff または gh pr diff の出力をそのまま貼り付け>
```

注意: ファイルパスや diff 内容は埋め込みで OK。「観点・チェック項目」については CLI 自身に
リポジトリ内のガイドラインファイルを読ませる（ask-others と同じく自律探索を尊重する）。

### 4. 並列レビューの実行

以下の3つのレビューを**並列**で実行する。

#### 4a. サブエージェント（Claude）によるレビュー

Agentツール（subagent_type: `general-purpose`）を使用：

- 変更対象のファイルパスと差分内容をプロンプトに含める
- review-guidelines.md の観点（正確性、セキュリティ、保守性、パフォーマンス、一貫性）に基づいてレビューを依頼
- review-checklist.md の項目をチェック基準として指定
- 新しいコンテキストで客観的に評価

#### 4b. Gemini CLI によるレビュー（バックグラウンド実行）

```bash
# Bash ツールの run_in_background: true で実行
cat .tmp/review-prompt.txt | gemini
```

#### 4c. Codex CLI によるレビュー（バックグラウンド実行）

```bash
# Bash ツールの run_in_background: true, timeout: 300000 で実行
cat .tmp/review-prompt.txt | codex exec --sandbox read-only -
```

注意:
- **プロンプトと diff は必ず Write ツールで一時ファイルに書き出し、`cat` でパイプすること**
- **Gemini / Codex は両方とも Bash ツールの `run_in_background: true` を指定すること**
  （Codex は推論に長時間かかるため、タイムアウト回避が必須）
- 完了通知が届いたら TaskOutput で結果を取得する
- Codex は `--sandbox read-only` でファイル変更を防止する
- いずれかがエラー・タイムアウトした場合は、応答できたツールの結果のみで報告する

### 5. レビュー結果の統合・報告

3者のレビュー結果を統合してユーザーに報告する。

報告フォーマット：

````
## レビュー結果

### 重要度: 高
- [共通] ...（2者以上が指摘した項目）
- [Claude] ...
- [Gemini] ...
- [Codex] ...

### 重要度: 中
- ...

### 重要度: 低
- ...

### 総評
（変更全体の評価と主要な改善ポイントのまとめ）
````

統合のポイント：
- 問題点・改善提案を重要度（高/中/低）で分類
- Claude / Gemini / Codex それぞれの指摘を明記
- 2者以上で共通する指摘は `[共通]` として特に重要視
- 修正が必要な場合は具体的な提案を含める

### 6. PR へのアクション（PR レビューの場合のみ）

レビュー結果に基づき、ユーザーに次のアクションを提案する：

**重要度「高」と[共通]の指摘が0件の場合:**
- レビュー結果を PR にコメントとして投稿するか確認
- マージして良いか確認（マージ方式はリポジトリのデフォルトに従う。merge commit / squash / rebase はリポジトリ設定や運用に合わせる）

```bash
gh pr comment <PR番号> --body "レビュー結果コメント"
gh pr merge <PR番号> --merge      # merge commit
gh pr merge <PR番号> --squash     # squash merge
gh pr merge <PR番号> --rebase     # rebase merge
```

**重要度「高」と[共通]の指摘がある場合:**
- 指摘内容を PR コメントに投稿
- 修正が必要な旨をユーザーに報告
- 修正後に再度 `/review` を実行するよう案内
