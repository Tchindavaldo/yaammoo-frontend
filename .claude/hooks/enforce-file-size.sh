#!/usr/bin/env bash
# R26 — PostToolUse (Edit|Write) : un fichier de code modifie qui depasse 500
# lignes renvoie un message BLOQUANT (exit 2) a Claude : il doit le decouper
# dans la meme tache, pas le signaler « pour plus tard ».
# Exclus : locales/*.json, architecture/*.md, todo/, tout ce qui n'est pas du code.
source "$(dirname "$0")/lib-payload.sh"

payload="$(cat)"
file="$(payload_get "$payload" '.tool_input.file_path')"
[ -z "$file" ] && exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac
case "$file" in
  */node_modules/*|*/locales/*|*/.claude/*) exit 0 ;;
esac
[ -f "$file" ] || exit 0

lines=$(wc -l < "$file" | tr -d ' ')
if [ "$lines" -gt 500 ]; then
  echo "R26 : $file fait $lines lignes (plafond 500). Decoupe-le MAINTENANT par responsabilite (sous-composant, hook, util, styles), sans changer le comportement, avant de clore la tache." >&2
  exit 2
fi
exit 0
