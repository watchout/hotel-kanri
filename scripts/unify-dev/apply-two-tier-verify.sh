#!/usr/bin/env bash
set -euo pipefail

DEV_DB_HOST="${DEV_DB_HOST:-163.44.97.2}"

write_verify() {
  local dir="$1"
  mkdir -p "$dir/scripts"
  cat > "$dir/scripts/verify-db-url.sh" <<'EOS'
#!/usr/bin/env bash
set -euo pipefail
mode="${UNIFY_ENV:-local}"   # local or dev
url="${DATABASE_URL:-}"
if [[ -z "$url" ]]; then echo "NG: DATABASE_URL not set" >&2; exit 1; fi
echo "$url" | grep -Eq 'postgresql://hotel_app:.*@' || { echo "NG: user=hotel_app 必須" >&2; exit 1; }
echo "$url" | grep -Eq '/hotel_unified_db(\?|$)' || { echo "NG: db=hotel_unified_db 必須" >&2; exit 1; }

case "$mode" in
  local)
    # 127.0.0.1/localhost/::1 を許可
    echo "$url" | grep -Eq '@(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?(/|\?|$)' \
      || { echo "NG: localはlocalhost/127.0.0.1/::1のみ許可" >&2; exit 1; }
    ;;
  dev)
    # 開発統合DBホストのみ許可（既定 163.44.97.2）
    host_allowed="${DEV_DB_HOST:-163.44.97.2}"
    echo "$url" | grep -Eq "@(${host_allowed//./\\.})(:[0-9]+)?(/|\?|$)" \
      || { echo "NG: devは${host_allowed}のみ許可（DEV_DB_HOSTで変更可）" >&2; exit 1; }
    # localhostは禁止
    echo "$url" | grep -Eq '@(localhost|127\.0\.0\.1|\[::1\])' && { echo "NG: devでlocalhost禁止" >&2; exit 1; }
    ;;
  *)
    echo "NG: UNIFY_ENV must be local or dev" >&2; exit 1;;
esac
echo "OK: ${mode} 統合DB接続"
EOS
  chmod +x "$dir/scripts/verify-db-url.sh"
}

append_env_example() {
  local dir="$1"
  local envf="$dir/.env.example"
  touch "$envf"
  grep -q '^UNIFY_ENV=' "$envf" 2>/dev/null || echo 'UNIFY_ENV=local' >> "$envf"
  grep -q '^DATABASE_URL=' "$envf" 2>/dev/null || echo 'DATABASE_URL=postgresql://hotel_app:<LOCAL_DB_PASSWORD>@127.0.0.1:5432/hotel_unified_db' >> "$envf"
}

patch_pkg_json_dev_start() {
  local dir="$1"
  local dev_cmd_default="$2"
  local start_cmd_default="$3"
  local pj="$dir/package.json"
  [[ -f "$pj" ]] || return 0
  node -e '
    const fs=require("fs"), p=process.argv[1];
    const devCmdDefault=process.argv[2], startCmdDefault=process.argv[3];
    const j=JSON.parse(fs.readFileSync(p,"utf8"));
    j.scripts=j.scripts||{};
    const dev=j.scripts.dev||devCmdDefault;
    const start=j.scripts.start||startCmdDefault;
    const withVerify=(cmd,mode)=>cmd.includes("verify-db-url.sh")?cmd:(`UNIFY_ENV=${mode} bash scripts/verify-db-url.sh && `+cmd);
    j.scripts.dev = withVerify(dev,"local");
    j.scripts.start = withVerify(start,"dev");
    fs.writeFileSync(p,JSON.stringify(j,null,2));
  ' "$pj" "$dev_cmd_default" "$start_cmd_default"
}

# SaaS (Nuxt, 3100)
SAA=/Users/kaneko/hotel-saas
if [[ -d "$SAA" ]]; then
  write_verify "$SAA"
  append_env_example "$SAA"
  patch_pkg_json_dev_start "$SAA" "nuxt dev --port 3100 --strictPort" "node .output/server/index.mjs"
fi

# Member UI (Nuxt, 8080)
MEM_UI=/Users/kaneko/hotel-member/ui
if [[ -d "$MEM_UI" ]]; then
  write_verify "$MEM_UI"
  append_env_example "$MEM_UI"
  patch_pkg_json_dev_start "$MEM_UI" "nuxt dev --port 8080 --strictPort" "nuxt start --port 8080 --strictPort"
fi

# PMS (Node, 3300)
PMS=/Users/kaneko/hotel-pms
if [[ -d "$PMS" ]]; then
  write_verify "$PMS"
  append_env_example "$PMS"
  patch_pkg_json_dev_start "$PMS" "pnpm run dev -- --port 3300 --strictPort" "pnpm run start"
fi

# Member API (FastAPI, 3200) - ラッパーでverify
MEM_API=/Users/kaneko/hotel-member/api
if [[ -d "$MEM_API" ]]; then
  write_verify "$MEM_API"
  append_env_example "$MEM_API"
  mkdir -p "$MEM_API/scripts"
  cat > "$MEM_API/scripts/dev-api.sh" <<'EOS'
#!/usr/bin/env bash
set -euo pipefail
UNIFY_ENV=local bash "$(dirname "$0")/verify-db-url.sh"
uvicorn app.main:app --host 0.0.0.0 --port 3200 --reload
EOS
  chmod +x "$MEM_API/scripts/dev-api.sh"
fi

echo "✅ 2層統合DBガード導入・起動プリフック設定 完了"
