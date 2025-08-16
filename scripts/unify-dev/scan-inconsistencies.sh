#!/usr/bin/env bash
set -euo pipefail

SAAS_DIR="${SAAS_DIR:-/Users/kaneko/hotel-saas}"
MEMBER_DIR="${MEMBER_DIR:-/Users/kaneko/hotel-member}"
PMS_DIR="${PMS_DIR:-/Users/kaneko/hotel-pms}"
COMMON_DIR="${COMMON_DIR:-/Users/kaneko/hotel-common}"
OUT_DIR="${OUT_DIR:-/Users/kaneko/hotel-kanri/docs/integration/unify-dev}"
OUT_FILE="$OUT_DIR/scan-report-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$OUT_DIR"

scan_repo() {
  local name="$1"; local path="$2"; local docs="$2/docs"
  echo "===== [$name] $docs =====" | tee -a "$OUT_FILE"
  if [[ ! -d "$docs" ]]; then echo "(skip: $docs not found)" | tee -a "$OUT_FILE"; return; fi
  echo "-- hotel_integrated --" | tee -a "$OUT_FILE"
  grep -R -n "hotel_integrated" "$docs" || true | tee -a "$OUT_FILE"
  echo "-- 3000-series urls/ports --" | tee -a "$OUT_FILE"
  grep -R -nE "\b(3000|3001|3002|3003|3004)\b|proxy_pass.*300" "$docs" || true | tee -a "$OUT_FILE"
  echo "-- canonical markers --" | tee -a "$OUT_FILE"
  grep -R -nE "DATABASE_URL|hotel_unified_db|3100|3200|3300|3301|8080|strictPort" "$docs" || true | tee -a "$OUT_FILE"
  echo | tee -a "$OUT_FILE"
}

: > "$OUT_FILE"
scan_repo "hotel-saas"   "$SAAS_DIR"
scan_repo "hotel-member" "$MEMBER_DIR"
scan_repo "hotel-pms"    "$PMS_DIR"
scan_repo "hotel-common" "$COMMON_DIR"

echo "Scan completed -> $OUT_FILE" >&2
