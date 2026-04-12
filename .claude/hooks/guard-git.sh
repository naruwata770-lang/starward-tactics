#!/usr/bin/env bash
# guard-git.sh — PreToolUse Hook for Bash tool
# CLAUDE.md の git 関連禁止事項を機械的に強制する。
#
# 検査対象:
#   1. main への直 push (あらゆる refspec 形式)
#   2. git commit --amend
#   3. --no-verify フラグ
#
# なぜ node -e で JSON パースするか:
#   jq は環境によっては未インストール。Node プロジェクトなので node は確実に存在する。

set -euo pipefail

INPUT=$(cat)

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
deny() {
  local reason="$1"
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$reason\"}}"
  exit 0
}

# --- 1. main への直 push 検知 ---
# git push を含むコマンドで、refspec 部分に main が含まれるケースを広く捕捉。
# 対象: git push origin main, git push -f origin main, git push origin HEAD:main,
#        git push origin refs/heads/main, git push origin :main, git push upstream main 等
if echo "$COMMAND" | grep -qE 'git\s+push\s' ; then
  if echo "$COMMAND" | grep -qE '(^|\s)(main|HEAD:main|[^ ]*:main|[^ ]*:refs/heads/main|refs/heads/main)(\s|$)' ; then
    deny "[Hook] main への直 push は禁止されています。feature ブランチから PR 経由でマージしてください。"
  fi
fi

# --- 2. git commit --amend 検知 ---
if echo "$COMMAND" | grep -qE 'git\s+commit\s.*--amend' ; then
  deny "[Hook] git commit --amend は禁止されています。レビュー指摘の反映は新しいコミットを積んでください。"
fi

# --- 3. --no-verify 検知 ---
if echo "$COMMAND" | grep -qE 'git\s+(commit|push)\s.*--no-verify' ; then
  deny "[Hook] --no-verify は禁止されています。pre-commit hook が失敗した場合は根本原因を修正してください。"
fi

# すべてのチェックを通過 — 許可
exit 0
