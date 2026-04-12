# tacticsboard — Claude 運用ルート

「星の翼 (Starward Tactics) 戦術ボード」開発用エージェント指示。本体は索引で、詳細は分割ファイルへのポインタを辿る。

## 必須コマンド (push 前に全通過)

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

1 つでも fail したら根本原因を直してから push。`--no-verify` 禁止。

## 禁止事項

- **main への直 push 禁止** (文書修正でも PR 経由) → `.claude/rules/git-workflow.md`
- **既存コミットへの amend 禁止** (新コミットを積む) → `.claude/rules/git-workflow.md`
- **`window` / `globalThis` の直接モック禁止** (`vi.stubGlobal` を使う) → `.claude/rules/testing.md`
- **後方互換シム / 廃止コメントを残さない** (削除すべきコードは完全削除) → `.claude/rules/code-conventions.md`
- **`docs/uxaudit/` には人間向け成果物のみ置く** (`summary.md` / `manual-ai.md` / `install-log.md` 等。uxaudit 本家の raw artifact は plugin 既定 workspace に任せる) → `.claude/rules/uxaudit.md`

## ルーティング

- ブランチ・PR・merge・コミットメッセージ・事前計画フロー → `.claude/rules/git-workflow.md`
- コード規約 (コメント・定数集約・責務分離・SVG 制約) → `.claude/rules/code-conventions.md`
- テスト方針 (`__tests__` 配置・stubGlobal・Probe パターン) → `.claude/rules/testing.md`
- 実装原則 (Credo 4 原則: Core First / Wire Before Decorate / No Dead Code / Spec vs Evidence) → `.claude/rules/credo.md`
- State 管理 (Context 4 分割・withHistory・hooks) → `src/state/BoardContext.ts` 冒頭コメント
- 3 者並列レビュー (Claude / Gemini / Codex) → `/review` (`.claude/skills/review/`)
- セカンドオピニオン (Gemini + Codex) → `/ask-others` ※ローカル開発環境のみ (Gemini CLI + Codex CLI 必須)
- 大きめ実装の事前計画 → `drafts/<issue番号>-<topic>-plan.md` に書いてから `/ask-others`
- uxaudit (UX 回帰テスト: プラグイン or AI fallback) → `.claude/rules/uxaudit.md` / `.claude/rules/ux-review.md`
- iteration ベースライン → `docs/uxaudit/iteration-<N>/summary.md`

## 環境

- Node: `.nvmrc` 参照
- Shell: Windows 11 + Git Bash (パス区切りは `/`)

## Issue 作成

新規 Issue は `.github/ISSUE_TEMPLATE/task.md` テンプレートを使い、本文冒頭の `slug:` 行に kebab-case の topic を記入する (例: `slug: phase7-direction`)。slug は branch 名 `feat/<N>-<slug>` に使われ、parallel-worktree skill が自動取得する。blank issue (テンプレート未使用) は slug を持たないため自動 dispatch 対象外。自動化を使う Issue は必ずテンプレート経由で作成すること。

## Phase 進捗

`gh issue list` で確認 (Phase 番号と Issue 番号の対応を含む)。
