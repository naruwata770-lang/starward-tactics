#!/usr/bin/env bash
# guard-git.sh — PreToolUse Hook for Bash tool
# CLAUDE.md の git 関連禁止事項を機械的に強制する。
#
# 検査対象:
#   1. main への直 push (あらゆる refspec 形式)
#   2. git commit --amend
#   3. --no-verify フラグ (-n 短縮形を含む)
#
# なぜ node -e で JSON パースするか:
#   jq は環境によっては未インストール。Node プロジェクトなので node は確実に存在する。
#
# 既知の制限:
#   - git alias (例: git ci = git commit) は検知しない。
#     Claude Code が生成するコマンドは標準形式のみのため許容。

set -euo pipefail

INPUT=$(cat)

# --- 早期 exit: git コマンドを含まなければスキップ ---
# settings.json の if フィルタを外して compound コマンド
# (例: cd repo && git push origin main) にも対応するため、
# スクリプト内でキーワード有無を先にチェックする。
if ! echo "$INPUT" | grep -q 'git'; then
  exit 0
fi

# node -e で tool_input.command を抽出
COMMAND=$(echo "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { process.stdout.write(JSON.parse(d).tool_input.command || ''); }
    catch { process.stdout.write(''); }
  });
")

# コマンドが空なら何もしない
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# --- deny ヘルパー ---
# 注意: reason にダブルクォート (") やバックスラッシュ (\) を含めないこと。
# JSON 文字列リテラルとしてそのまま埋め込まれるためパースエラーになる。
deny() {
  local reason="$1"
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$reason\"}}"
  exit 0
}

# --- クォート除去 ---
# コミットメッセージ内の文字列 (例: git commit -m "fix --amend") で
# 偽陽性が出るのを防ぐため、引用符内の内容を除去してからフラグ検知する。
STRIPPED=$(echo "$COMMAND" | sed 's/"[^"]*"//g' | sed "s/'[^']*'//g")

# --- 1. main への直 push 検知 ---
# git push を含むコマンドで、refspec 部分に main が含まれるケースを広く捕捉。
# 対象: git push origin main, git push -f origin main, git push origin HEAD:main,
#        git push origin refs/heads/main, git push origin :main, git push upstream main 等
if echo "$STRIPPED" | grep -qE 'git\s+push\s' ; then
  if echo "$STRIPPED" | grep -qE '(^|\s)(main|HEAD:main|[^ ]*:main|[^ ]*:refs/heads/main|refs/heads/main)(\s|$)' ; then
    deny "[Hook] main への直 push は禁止されています。feature ブランチから PR 経由でマージしてください。"
  fi
fi

# --- 2. git commit --amend 検知 ---
if echo "$STRIPPED" | grep -qE 'git\s+commit\b' && echo "$STRIPPED" | grep -qE '(^|\s)--amend(\s|$)' ; then
  deny "[Hook] git commit --amend は禁止されています。レビュー指摘の反映は新しいコミットを積んでください。"
fi

# --- 3. --no-verify / -n 検知 ---
# git commit -n は --no-verify の短縮形。git push には -n 短縮はないため commit 限定。
if echo "$STRIPPED" | grep -qE 'git\s+(commit|push)\b' && echo "$STRIPPED" | grep -qE '(^|\s)--no-verify(\s|$)' ; then
  deny "[Hook] --no-verify は禁止されています。pre-commit hook が失敗した場合は根本原因を修正してください。"
fi
if echo "$STRIPPED" | grep -qE 'git\s+commit\b' && echo "$STRIPPED" | grep -qE '(^|\s)-n(\s|$)' ; then
  deny "[Hook] git commit -n (--no-verify) は禁止されています。pre-commit hook が失敗した場合は根本原因を修正してください。"
fi

# すべてのチェックを通過 — 許可
exit 0
