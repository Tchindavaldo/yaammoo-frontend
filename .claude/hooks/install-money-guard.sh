#!/usr/bin/env bash
# SessionStart — ARGENT (R23). Installe le mod money-guard (dépôt backend,
# claude-mods/) à chaque nouvelle session, sans intervention. Idempotent et non
# bloquant : les hooks du dépôt restent la couche garantie s'il échoue.
set -uo pipefail
here="$(cd "$(dirname "$0")/../.." && pwd)"
command -v claude >/dev/null 2>&1 || exit 0
if ! claude plugin list 2>/dev/null | grep -q 'money-guard'; then
  if [ -f "$here/../yaammoo-backend/.claude-plugin/marketplace.json" ]; then
    claude plugin marketplace add "$here/../yaammoo-backend" >/dev/null 2>&1 || true
  else
    claude plugin marketplace add Tchindavaldo/yaammoo-backend >/dev/null 2>&1 || true
  fi
  claude plugin install money-guard@yaammoo --scope user >/dev/null 2>&1 || true
fi
if claude plugin list 2>/dev/null | grep -q 'money-guard'; then
  echo "money-guard (garde-fou argent, R23) : installé."
else
  echo "⚠️ money-guard non installé : seuls les hooks du dépôt protègent l'argent (R23)."
fi
exit 0
