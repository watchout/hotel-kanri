#!/usr/bin/env bash
set -euo pipefail

url="${DATABASE_URL:-}"
mode="${UNIFY_ENV:-local}"  # local or dev
if [[ -z "${url}" ]]; then
  echo "NG: DATABASE_URL not set" >&2
  exit 1
fi

echo "$url" | grep -Eq 'postgresql://hotel_app:.*@' || { echo "NG: user=hotel_app 必須" >&2; exit 1; }
echo "$url" | grep -Eq '/hotel_unified_db(\?|$)' || { echo "NG: db=hotel_unified_db 必須" >&2; exit 1; }

host_part=$(echo "$url" | sed -E 's#^postgresql://[^@]+@([^/:]+).*$#\1#')

case "$mode" in
  local)
    echo "$host_part" | grep -Eq '^(localhost|127\.0\.0\.1|\[::1\])$' || { echo "NG: UNIFY_ENV=local は localhost/127.0.0.1/::1 のみ許可" >&2; exit 1; }
    ;;
  dev)
    # 開発統合DBホスト（必要に応じてホスト名/IPを拡張）
    echo "$host_part" | grep -Eq '^(163\.44\.97\.2|localhost|127\.0\.0\.1)$' || { echo "NG: UNIFY_ENV=dev は 開発統合DBホストのみ許可" >&2; exit 1; }
    ;;
  *)
    echo "NG: UNIFY_ENV must be local or dev" >&2; exit 1;
    ;;
esac

echo "OK: 統一DB接続 ($mode)"

