# uxaudit インストールログ (iteration-1 spike)

Issue #18 (`gotalab/uxaudit` 導入 spike) で実行した生コマンドとその出力。
手順の再現可能性を担保するための記録。

## 環境

- Claude Code CLI: `2.1.101`
- Node.js: `.nvmrc` 準拠 (このプロジェクト側は Node 20 系)
- Python: 3.10+ (uxaudit 内部スクリプト用。本 spike では未起動)
- Playwright Chromium: uxaudit 本体実行時に自動 DL (本 spike では未 DL)

## コマンドと出力

### 1. marketplace 追加

```
$ claude plugin marketplace add gotalab/uxaudit
Adding marketplace...
SSH not configured, cloning via HTTPS: https://github.com/gotalab/uxaudit.git
Refreshing marketplace cache (timeout: 120s)…
Cloning repository (timeout: 120s): https://github.com/gotalab/uxaudit.git
Clone complete, validating marketplace…
✔ Successfully added marketplace: gotalab-uxaudit (declared in user settings)
```

### 2. plugin 本体のインストール

```
$ claude plugin install uxaudit@gotalab-uxaudit
Installing plugin "uxaudit@gotalab-uxaudit"...
✔ Successfully installed plugin: uxaudit@gotalab-uxaudit (scope: user)
```

### 3. 導入確認

```
$ claude plugin list
Installed plugins:

  ❯ claude-hud@claude-hud
    Version: 0.0.7
    Scope: user
    Status: ✔ enabled

  ❯ skill-creator@claude-plugins-official
    Version: unknown
    Scope: user
    Status: ✔ enabled

  ❯ uxaudit@gotalab-uxaudit
    Version: 0.1.0
    Scope: user
    Status: ✔ enabled
```

### 4. プラグイン本体の置き場所 (確認用)

`C:/Users/nanao/.claude/plugins/marketplaces/gotalab-uxaudit/` 配下に clone されている:

```
.claude-plugin/
  marketplace.json
  plugin.json
agents/
  uxaudit-journey-compiler.md
  uxaudit-l3-judge.md
  uxaudit-l4-judge.md
  uxaudit-locator.md
  uxaudit-proposer.md
  uxaudit-reconciler.md
  uxaudit-scout.md
skills/uxaudit/
  SKILL.md
  checks/ (accessibility / ai-slop / core-experience / desirability / usability)
  scripts/ (capture.mjs / aggregate.py / run_all_checks.py / ...)
  schemas/
  templates/
  references/
  package.json  ← playwright 1.58.2, axe-core 4.9.1
```

## 動作確認で起きたこと

1. `npm run preview` 側は問題なく起動した (`http://localhost:4173` でレスポンスあり)
2. `/uxaudit:uxaudit tacticsboard --lang ja` を叩く前に、現セッションの
   user-invocable skill 一覧 (システムリマインダー) を確認したところ
   `uxaudit:uxaudit` は list されていなかった
3. Claude Code は **plugin の skill / subagent をセッション開始時にのみ load** するため、
   mid-session で install しても新しい slash command は現セッションには現れない
4. 回避策は 2 通り:
   - Claude Code を再起動 (推奨) → `/uxaudit:uxaudit` が使えるようになる
   - fallback として `.claude/rules/ux-review.md` の手動プロトコルに切替

spike #18 では **4 を fallback** に切り替え、iteration-1 ベースラインは
コード読解 + `npm run preview` の手動観察で作成した (→ `summary.md`)。

## 次に人間が踏むべきステップ

1. 現在の Claude Code セッションを終了し、新しいセッションを起動する
2. `PORT=4173 npm run preview` を別ターミナルで立ち上げる
3. Claude Code 上で `/uxaudit:uxaudit tacticsboard --lang ja` を実行
4. 生成される `iteration-N/` 構造を同じ `docs/uxaudit/iteration-1/` に統合する
   (既存の `summary.md` / `install-log.md` は残す)
5. uxaudit が吐く `benchmark.json` と `evidence/*.png` を見ながら、
   本ファイルの「4 失敗パターン判定」と「重要度: 高」項目を答え合わせする
