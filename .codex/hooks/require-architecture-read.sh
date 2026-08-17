#!/usr/bin/env bash
# PreToolUse — bloque toute recherche (Grep/Glob/grep-shell) tant que l'agent
# n'a pas lu l'architecture/<feature>.md CORRESPONDANT au fichier/dossier vise.
#
# Motif (R3) : lire un seul architecture/*.md (ex. README.md) une fois par
# session ne dit rien sur l'ecran/la feature reellement grep-ee ensuite. On
# exige donc la lecture du doc de la feature concernee, par feature.
#
# Detection AUTOMATIQUE, sans liste codee en dur : la feature est deduite du
# chemin cible (segment apres src/features/, ou nom de fichier app/(tabs)/).
# Une feature (dossier ou fichier) qui n'a pas encore de architecture/*.md
# n'est simplement pas couverte par le hook -> pas de blocage sur elle, rien a
# maintenir a chaque nouvelle feature.
#
# Le marqueur vit dans /tmp, cle par session ET par feature : il disparait a
# chaque nouvelle session, et chaque feature doit etre lue une fois.

set -uo pipefail

payload=$(cat)

tool=$(printf '%s' "$payload" | jq -r '.tool_name // empty')
session=$(printf '%s' "$payload" | jq -r '.session_id // "nosession"')
marker_dir="/tmp/claude-arch-read-${session}"
arch_dir="${CLAUDE_PROJECT_DIR:-.}/architecture"

# --- Deduit le nom de doc feature (sans .md) depuis un chemin/pattern, en ne
# se basant QUE sur la structure du repo (src/features/<x>, app/(tabs)/<x>.tsx)
# puis en verifiant qu'un architecture/<x>.md existe reellement. ---
feature_of() {
  local s="$1" candidate=""

  if [[ "$s" =~ src/features/([a-zA-Z0-9_-]+) ]]; then
    candidate="${BASH_REMATCH[1]}"
  elif [[ "$s" =~ \(tabs\)/([a-zA-Z0-9_-]+)\.tsx ]]; then
    candidate="${BASH_REMATCH[1]}"
  elif [[ "$s" =~ src/services/([a-zA-Z0-9_-]+) ]]; then
    candidate="${BASH_REMATCH[1]}"
  fi

  [ -z "$candidate" ] && return

  # Le nom du dossier/fichier de code ne colle pas toujours 1:1 au nom du doc
  # (ex. feature "orders" -> orders-client.md / orders-merchant.md). On
  # cherche donc tout architecture/*.md dont le nom COMMENCE par le candidat.
  local match
  match=$(find "$arch_dir" -maxdepth 1 -iname "${candidate}*.md" 2>/dev/null | head -1)
  [ -z "$match" ] && return
  basename "$match" .md
}

mkdir -p "$marker_dir" 2>/dev/null

# --- Cas 1 : lecture d'un architecture/*.md -> on pose le marqueur pour CETTE feature ---
if [ "$tool" = "Read" ]; then
  path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')
  case "$path" in
    */architecture/*.md)
      base=$(basename "$path" .md)
      : > "$marker_dir/$base"
      ;;
  esac
  exit 0
fi

# --- Cas 2 : recherche -> determiner la feature visee et verifier son marqueur ---
target=""
case "$tool" in
  Grep|Glob)
    target=$(printf '%s' "$payload" | jq -r '(.tool_input.pattern // "") + " " + (.tool_input.path // "")')
    ;;
  Bash)
    cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""')
    case "$cmd" in
      *grep*|*"rg "*|*"find "*) target="$cmd" ;;
      *) exit 0 ;;
    esac
    ;;
  *)
    exit 0
    ;;
esac

feature=$(feature_of "$target")

# Chemin non reconnu OU aucune doc feature correspondante -> pas de blocage
# (recherche generique, config, ou feature pas encore documentee).
[ -z "$feature" ] && exit 0

# Marqueur deja pose pour CETTE feature -> ok.
[ -f "$marker_dir/$feature" ] && exit 0

cat >&2 <<EOF
BLOQUE (R3) — recherche sur la feature "${feature}" avant d'avoir lu son architecture.

Recherche refusee : ${target}

Lis d'abord architecture/${feature}.md avec l'outil Read (architecture/README.md
donne l'index general). Chaque feature grep-ee doit avoir son doc lu au moins
une fois dans la session, pas seulement un README generique.

Une fois architecture/${feature}.md lu, les recherches sur CETTE feature sont
autorisees pour le reste de la session.
EOF
exit 2
