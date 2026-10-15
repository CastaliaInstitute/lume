#!/usr/bin/env bash
set -euo pipefail

project_ref="pilmscrodlitdrygabvo"
key_file="$(mktemp "${TMPDIR:-/tmp}/lume-fal-key.XXXXXX")"
chmod 600 "$key_file"
trap 'rm -f "$key_file"' EXIT

if ! command -v supabase >/dev/null 2>&1; then
  printf '%s\n' 'Supabase CLI is required. Install it from https://supabase.com/docs/guides/cli.' >&2
  exit 1
fi

python3 -c 'import getpass, pathlib, sys; pathlib.Path(sys.argv[1]).write_text(getpass.getpass("Paste fal API key (input hidden): ") + "\n")' "$key_file"
if ! grep -q '[^[:space:]]' "$key_file"; then
  printf '%s\n' 'No key entered; nothing changed.' >&2
  exit 1
fi

printf 'FAL_KEY=%s\n' "$(cat "$key_file")" > "${key_file}.env"
chmod 600 "${key_file}.env"
supabase secrets set --project-ref "$project_ref" --env-file "${key_file}.env"
supabase functions deploy lume-generate-art --project-ref "$project_ref"
printf '\n%s\n' 'fal secret configured and Lume generator deployed.'
