# Hook 強制化

CLAUDE.md の禁止事項のうち、機械的に検知できるものを `.claude/settings.json` の Hook で強制化している。

## 有効な Hook

### PreToolUse: guard-git.sh

Bash ツールで `git *` コマンドが実行される前に発火し、以下をブロックする。

| ルール | ブロック対象 | CLAUDE.md 対応 |
|--------|------------|----------------|
| main 直 push 禁止 (明示 refspec) | `git push ... main` など refspec 形式 (`HEAD:main` / `refs/heads/main` / `:main` 等を含む) | 禁止事項 1 |
| main 上の全 push 禁止 (現在ブランチ) | 現在ブランチが main の状態で `git push` を実行すると refspec に依らず deny (`git push origin feature-x` や tag push も含む)。CLAUDE.md の「main 上で直接作業しない」原則を強制するため広めに deny している。issue #57 で追加 | 禁止事項 1 |
| amend 禁止 | `git commit --amend` | 禁止事項 2 |
| --no-verify 禁止 | `git commit --no-verify` (`-n` 含む), `git push --no-verify` | 必須コマンド節 |

ブロック時は deny 理由が Claude に返され、代替手段が案内される。

### 既知の限界 (guard-git.sh)

正規表現ベースの擬似パースであり、以下は拾えない。サーバー側の GitHub branch protection rule と併用することが前提:

- `git` alias / shell function 経由の push
- `gh repo sync` / `hub push` など周辺 CLI 経由の更新
- heredoc / エスケープクォート / ANSI-C quoting (`$'...'`) を含むコマンド (偽陽性・偽陰性が発生しうる)
- 現在ブランチ検知 (1b) は `$CLAUDE_PROJECT_DIR` のリポジトリ HEAD を見るため、`cd /other/repo && git push` や `git -C /other/repo push` のように compound で別リポジトリへ push するケースは本プロジェクトの HEAD に基づいて誤判定しうる (tacticsboard の main を見て deny する、または検知漏れ)

### Stop: quality-gate.sh

Claude がタスク完了で停止する前に発火し、品質ゲートを実行する。

- **変更検知**: `git diff` で変更なし (調査セッション等) ならスキップ
- **品質ゲート**: `npm run lint` / `typecheck` / `test` / `build` を順次実行
- **失敗時**: 停止を拒否し、失敗したコマンドを通知。Claude は修正を試みる

## 機械強制できない禁止事項

以下はセマンティック理解が必要なため Hook での強制ができず、CLAUDE.md の自己遵守ルールとして維持する。

- `window` / `globalThis` の直接モック禁止 (`vi.stubGlobal` を使う)
- 後方互換シム / 廃止コメントを残さない

## Hook の無効化

個人環境で一時的に Hook を無効化したい場合は `.claude/settings.local.json` (gitignore 済み) で上書きできる。

```json
{
  "hooks": {}
}
```

## ファイル構成

```
.claude/
├── settings.json          # Hook 定義 (git 追跡・リモート環境でも有効)
└── hooks/
    ├── guard-git.sh        # PreToolUse: git ルール強制
    └── quality-gate.sh     # Stop: 品質ゲート
```
