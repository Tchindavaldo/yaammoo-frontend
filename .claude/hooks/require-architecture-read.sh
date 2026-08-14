#!/usr/bin/env bash
# PreToolUse — bloque toute recherche (Grep/Glob/grep-shell) tant que l'agent
# n'a pas lu au moins un fichier architecture/*.md dans la session.
#
# Motif (R3) : le raccourci « grep pour trouver le fichier » donne des noms sans
# le contexte, et c'est le contexte de architecture/<feature>.md qui evite de
# modifier le mauvais ecran. Le hook rend la regle mecanique.
#
# Le marqueur vit dans /tmp, cle par session : il disparait a chaque nouvelle
# session, donc la lecture est exigee une fois par conversation.

set -uo pipefail

payload=$(cat)

tool=$(printf '%s' "$payload" | jq -r '.tool_name // empty')
session=$(printf '%s' "$payload" | jq -r '.session_id // "nosession"')
marker="/tmp/claude-arch-read-${session}"

# --- Cas 1 : lecture d'un architecture/*.md -> on pose le marqueur ---
if [ "$tool" = "Read" ]; then
  path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')
  case "$path" in
    */architecture/*.md) : > "$marker" ;;
  esac
  exit 0
fi

# Marqueur deja pose : plus rien a bloquer pour le reste de la session.
[ -f "$marker" ] && exit 0

# --- Cas 2 : recherche avant lecture -> on bloque ---
target=""
case "$tool" in
  Grep|Glob)
    target=$(printf '%s' "$payload" | jq -r '.tool_input.pattern // ""')
    ;;
  Bash)
    cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""')
    # Seules les recherches de code sont concernees ; git/ls/npm passent.
    case "$cmd" in
      *grep*|*"rg "*|*"find "*) target="$cmd" ;;
      *) exit 0 ;;
    esac
    ;;
  *)
    exit 0
    ;;
esac

cat >&2 <<EOF
BLOQUE (R3) — recherche lancee avant d'avoir lu architecture/.

Recherche refusee : ${target}

Lis d'abord le fichier architecture/<feature>.md pertinent avec l'outil Read
(architecture/README.md donne l'index). Il decrit quel ecran utilise quel
composant — c'est ce contexte qui manque a un grep.

Une fois un architecture/*.md lu, les recherches sont a nouveau autorisees
pour le reste de la session.
EOF
exit 2
