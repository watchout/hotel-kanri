# プロジェクト固有の事実

テスト用アカウント、環境変数、API仕様など、プロジェクト固有の情報を記録します。

---

## テスト用アカウント

### 管理者アカウント
| 項目 | 値 |
|:-----|:---|
| Email | `owner@test.omotenasuai.com` |
| Password | `owner123` |
| Tenant ID | `tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7` |

### ログインコマンド
```bash
curl -s -c /tmp/cookies.txt -X POST http://localhost:3101/api/v1/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@test.omotenasuai.com","password":"owner123"}' | jq .
```

---

## ポート番号

| システム | ポート | 用途 |
|:---------|:-------|:-----|
| hotel-saas-rebuild | 3101 | フロントエンド + プロキシ |
| hotel-common-rebuild | 3401 | API基盤 + DB層 |
| PostgreSQL | 5432 | データベース |
| Redis | 6379 | セッション |

---

## ヘルスチェック

```bash
# hotel-common
curl http://localhost:3401/health

# hotel-saas
curl http://localhost:3101/api/v1/health
```

---

## 環境変数ファイル

| ファイル | 用途 |
|:---------|:-----|
| `.env.mcp` | API キー（ANTHROPIC, OPENAI, GEMINI） |
| `.env` | アプリケーション設定 |

---

## 重要ディレクトリ

| パス | 内容 |
|:-----|:-----|
| `/Users/kaneko/hotel-kanri/` | 管理リポジトリ（SSOT等） |
| `/Users/kaneko/hotel-saas-rebuild/` | フロントエンド |
| `/Users/kaneko/hotel-common-rebuild/` | API基盤 |
| `/Users/kaneko/hotel-kanri/docs/03_ssot/` | SSOTドキュメント |

---

## Cookie名

| 名前 | 用途 |
|:-----|:-----|
| `hotel_session` | セッションID |

---

## API認証ヘッダー

### Session認証（標準）
```
Cookie: hotel_session=xxx
```

### テナント指定（hotel-common内部）
```
x-tenant-id: tenant-xxx
```
