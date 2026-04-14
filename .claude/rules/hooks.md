# Hook 強制化

CLAUDE.md の禁止事項のうち、機械的に検知できるものを `.claude/settings.json` の Hook で強制化している。

## 有効な Hook

### PreToolUse: guard-git.sh

Bash ツールで `git *` コマンドが実行される前に発火し、以下をブロックする。

| ルール | ブロック対象 | CLAUDE.md 対応 |
|--------|------------|----------------|
| main / dev 直 push 禁止 (明示 refspec) | `git push ... main` / `git push ... dev` など refspec 形式 (`HEAD:main` / `HEAD:dev` / `refs/heads/main` / `refs/heads/dev` / `:main` / `:dev` 等を含む)。dev 対応は issue #79 で追加 | 禁止事項 1 |
| main / dev 上の全 push 禁止 (現在ブランチ) | 現在ブランチが main または dev の状態で `git push` を実行すると refspec に依らず deny (`git push origin feature-x` や tag push も含む)。CLAUDE.md の「main / dev 上で直接作業しない」原則を強制するため広めに deny している。issue #57 で main、issue #79 で dev を追加 | 禁止事項 1 |
| amend 禁止 | `git commit --amend` | 禁止事項 2 |
| --no-verify 禁止 | `git commit --no-verify` (`-n` 含む), `git push --no-verify` | 必須コマンド節 |

ブロック時は deny 理由が Claude に返され、代替手段が案内される。

### 既知の限界 (guard-git.sh)

正規表現ベースの擬似パースであり、以下は拾えない。サーバー側の GitHub branch protection rule と併用することが前提:

- `git` alias / shell function 経由の push
- `gh repo sync` / `hub push` など周辺 CLI 経由の更新
- heredoc / エスケープクォート / ANSI-C quoting (`$'...'`) を含むコマンド (偽陽性・偽陰性が発生しうる)
- 現在ブランチ検知 (1b) は `$CLAUDE_PROJECT_DIR` のリポジトリ HEAD を見るため、`cd /other/repo && git push` や `git -C /other/repo push` のように compound で別リポジトリへ push するケースは本プロジェクトの HEAD に基づいて誤判定しうる (tacticsboard の main を見て deny する、または検知漏れ)
- `git -C /other/repo push origin main` のように `git` の直後に `push` が続かないコマンドは push 検知ブロックに入らずすり抜ける (issue #62 の K2 で fixate)
- `git commit -nm "msg"` のような combined short flag は `(^|\s)-n(\s|$)` regex で捕捉できず通る (issue #62 の K4 で fixate)
- detached HEAD 中は `git symbolic-ref` が空文字を返すため 1b 検知が発火しない (意図的・K3 で fixate)
- 引用符付き refspec `git push origin "main"` はクォート除去 sed で main が消え 1a 不発火 (K7 で fixate。Claude Code の生成コマンドは通常クォートしないため実害は限定的)

### bootstrap の chicken-and-egg

新 dev ブランチを GitHub 上に作る bootstrap そのものは `git push` 経由だと
自分の hook に弾かれる (`:refs/heads/dev` refspec が 1a に matches する)。
Issue #79 では **`gh api repos/<owner>/<repo>/git/refs`** を使って ref を直接
作成することで guard を踏まず bootstrap した。`gh api` は `git` コマンドでは
ないため guard の対象外。同様のケース (例: 将来 stage ブランチを足したい時) も
この手順を踏襲する。

### テスト

`.claude/hooks/__tests__/guard-git.bats` (bats-core 1.13) で黒箱ユニットテストを回している。
仕様テスト (T1-T30) と既知の限界 fixate (K1-K7) の 2 階層構造。
dev 関連の仕様テストは T20-T30 (issue #79 で追加)。

- ローカル: `npm run test:hooks` (`npm run test` からも呼ばれる)
- CI: `.github/workflows/ci.yml` の `Test (hooks / bats)` step

**Git Bash / MSYS2 / WSL / Linux 前提**。bats-core は Windows ネイティブを第一級
サポートしていないため、PowerShell 単独環境では `npm run test:hooks` は動かない。
Windows ユーザは Git for Windows の Git Bash を入れること。

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
    ├── quality-gate.sh     # Stop: 品質ゲート
    └── __tests__/
        └── guard-git.bats  # bats ユニットテスト (issue #62)
```
