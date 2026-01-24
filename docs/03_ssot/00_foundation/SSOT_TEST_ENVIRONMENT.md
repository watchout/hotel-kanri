# 🧪 SSOT: テスト環境・テストアカウント

**Doc-ID**: SSOT-TEST-ENV-001  
**バージョン**: 1.1.0  
**作成日**: 2025年10月3日  
**最終更新**: 2025年10月6日  
**ステータス**: 🔴 承認済み（最高権威）  
**所有者**: Iza（統合管理者）

**関連SSOT**:
- [SSOT_PRODUCTION_PARITY_RULES.md](./SSOT_PRODUCTION_PARITY_RULES.md) - 🔴 **本番同等実装ルール（必読）**
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](./SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_SAAS_DEVICE_AUTHENTICATION.md](./SSOT_SAAS_DEVICE_AUTHENTICATION.md) - デバイス認証

---

## 📋 概要

### 目的
開発・テスト環境で使用する統一されたテストアカウント・テストテナント情報を定義する。

### 適用範囲
- 全システム（hotel-saas、hotel-common、hotel-pms、hotel-member）
- 開発環境でのテスト・デバッグ
- AI開発者（Sun、Suno、Luna）の実装・検証作業

### 重要性
各システム担当AI（Sun、Suno、Luna）がテストアカウント情報を忘れないよう、このSSOTに集約して管理する。

---

## ⚠️ 必須要件（CRITICAL）

### 🚨 最重要: テナントID `default` のハードコード禁止

**⚠️ 絶対に守ること**:

```typescript
// ❌ 絶対禁止（本番で動かない）
const tenantId = user.tenant_id || 'default';
tenantId: 'default'

// ✅ 正しい実装（本番同等）
const tenantId = user.tenant_id || user.tenantId;
if (!tenantId) {
  throw createError({
    statusCode: 400,
    statusMessage: 'Tenant ID is required'
  });
}
```

**理由**:
- 開発環境: `'default'`テナントが存在するため動作する
- 本番環境: `'default'`テナントは存在せず、**全機能が停止**

**詳細**: [SSOT_PRODUCTION_PARITY_RULES.md](./SSOT_PRODUCTION_PARITY_RULES.md)

---

### 1. テスト情報の統一
**全システム・全AI開発者は、このSSOTに記載されたテスト情報のみを使用すること。**

- ✅ 正しい: このSSOTに記載されたアカウント情報を使用
- ❌ 間違い: 各システムで独自のテストアカウントを作成
- ❌ 間違い: 古いドキュメントのテスト情報を使用

### 2. 本番環境での使用禁止
**これらのテスト情報は開発・テスト環境専用です。本番環境では絶対に使用しないこと。**

### 3. ハードコード禁止（🔴 新規追加）
**コード内に `'default'` を直接書いてはいけない。必ずセッション/認証情報から動的取得すること。**

---

## 🏨 テストテナント

### 基本情報

| 項目 | 値 |
|------|------|
| **テナントID** | `test-tenant-001` |
| **テナント名** | テストホテルグループ |
| **用途** | 開発・テスト環境専用 |
| **データベース** | hotel_unified_db |

### 使用場面
- マルチテナント機能のテスト
- データ分離のテスト
- 全システムの統合テスト

### 重要事項
- テナントID `test-tenant-001` は全システムで共通
- 他のテナントIDは作成しない（統一性のため）
- **注意**: コード内でこの値をハードコードしてはいけない（認証情報から動的取得必須）

---

## 🔑 テストアカウント

### 管理画面用アカウント（複数役割対応）

#### Owner（オーナー）アカウント

| 項目 | 値 |
|------|------|
| **メールアドレス** | `owner@test.omotenasuai.com` |
| **パスワード** | `owner123` |
| **役割** | OWNER |
| **テナントID** | `test-tenant-001` |
| **用途** | オーナー権限テスト・複数テナント所属テスト |

#### Manager（マネージャー）アカウント

| 項目 | 値 |
|------|------|
| **メールアドレス** | `manager@test.omotenasuai.com` |
| **パスワード** | `manager123` |
| **役割** | MANAGER |
| **テナントID** | `default` |
| **用途** | マネージャー権限テスト |

#### Staff（スタッフ）アカウント

| 項目 | 値 |
|------|------|
| **メールアドレス** | `staff@test.omotenasuai.com` |
| **パスワード** | `staff123` |
| **役割** | STAFF |
| **テナントID** | `default` |
| **用途** | スタッフ権限テスト |

#### 使用場面
- hotel-saas管理画面へのログイン
- hotel-common API認証のテスト
- Session認証のテスト
- 役割別権限テスト
- 複数テナント所属テスト（owner@test.omotenasuai.com推奨）
- フロントエンド開発時の動作確認

#### 認証方式
- **認証タイプ**: Session認証（Redis + HttpOnly Cookie）
- **詳細**: [SSOT_SAAS_ADMIN_AUTHENTICATION.md](./SSOT_SAAS_ADMIN_AUTHENTICATION.md)

---

### スーパーアドミンアカウント（固定）

| 項目 | 値 |
|------|------|
| **ユーザーID** | `superadmin` |
| **パスワード** | `dev123` |
| **権限レベル** | システム全体管理 |
| **用途** | システム全体の管理・設定 |

#### 使用場面
- システム全体の設定変更
- テナント管理
- システム管理者権限が必要な機能のテスト

#### 重要事項
- スーパーアドミンは複数アカウント不要
- このアカウントのみを使用すること
- 本番環境では別のアカウントを使用

---

## 🎯 各システムでの使用方法

### hotel-saas（Sun担当）

#### 管理画面ログインテスト
```typescript
// テストコード例
const loginResponse = await $fetch('/api/auth/login', {
  method: 'POST',
  body: {
    email: 'admin@omotenasuai.com',
    password: 'admin123'
  }
});
```

#### セッション確認
```bash
# Redisでセッション確認
redis-cli KEYS "hotel:session:*"
redis-cli GET "hotel:session:{sessionId}"
```

---

### hotel-common（共通基盤）

#### 認証API動作確認
```bash
# ログインAPI
curl -X POST http://localhost:3400/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@omotenasuai.com",
    "password": "admin123",
    "tenantId": "default"
  }'
```

---

### hotel-pms（Luna担当）

#### テナントID確認
```typescript
// tenant_id = 'default' であることを確認
const reservations = await prisma.reservation.findMany({
  where: {
    tenantId: 'default'
  }
});
```

---

### hotel-member（Suno担当）

#### マルチテナントテスト
```typescript
// tenant_id = 'default' でフィルタリング
const customers = await prisma.customer.findMany({
  where: {
    tenantId: 'default'
  }
});
```

---

## 🔍 検証方法（効率的テスト実行）

### 基本原則: 無駄な再起動を避ける

**重要**: サーバーが既に起動している場合は、そのまま使用する。

```
検証フロー:
1. API疎通確認（最優先）
   ↓ 成功 → テスト実行
   ↓ 失敗
2. ポート使用状況確認
   ↓ 使用中 → サーバー起動済み → API再確認
   ↓ 未使用
3. サーバー起動
   ↓
4. API疎通確認
   ↓
5. テスト実行
```

**❌ 避けるべきパターン**:
```bash
# ❌ 無駄な動作: ポート確認 → kill → 再起動
lsof -ti:3100 | xargs kill -9  # サーバーが正常動作中でも強制終了
npm run dev                     # 同じサーバーを再起動
```

**✅ 推奨パターン**:
```bash
# ✅ 効率的: API疎通確認 → 失敗時のみ対応
curl -f http://localhost:3100/api/health || {
  # API疎通失敗時のみポート確認・起動処理
  echo "API疎通失敗。サーバー状態を確認します..."
}
```

---

### 1. 統合検証スクリプト（推奨）

#### 自動検証スクリプト作成

以下のスクリプトを `/Users/kaneko/hotel-kanri/scripts/verify-test-env.sh` として保存:

```bash
#!/bin/bash

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 テスト環境検証を開始します..."

# ========================================
# 1. API疎通確認（最優先）
# ========================================

echo ""
echo "📡 Step 1: API疎通確認"

# hotel-common (3400)
echo -n "  hotel-common (3400): "
if curl -f -s http://localhost:3400/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 稼働中${NC}"
  COMMON_OK=true
else
  echo -e "${YELLOW}✗ 応答なし${NC}"
  COMMON_OK=false
fi

# hotel-saas (3100)
echo -n "  hotel-saas (3100): "
if curl -f -s http://localhost:3100/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 稼働中${NC}"
  SAAS_OK=true
else
  echo -e "${YELLOW}✗ 応答なし${NC}"
  SAAS_OK=false
fi

# hotel-pms (3300)
echo -n "  hotel-pms (3300): "
if curl -f -s http://localhost:3300/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 稼働中${NC}"
  PMS_OK=true
else
  echo -e "${YELLOW}✗ 応答なし${NC}"
  PMS_OK=false
fi

# hotel-member (3200)
echo -n "  hotel-member (3200): "
if curl -f -s http://localhost:3200/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 稼働中${NC}"
  MEMBER_OK=true
else
  echo -e "${YELLOW}✗ 応答なし${NC}"
  MEMBER_OK=false
fi

# ========================================
# 2. API疎通失敗時のみポート確認
# ========================================

if [ "$COMMON_OK" = false ] || [ "$SAAS_OK" = false ] || [ "$PMS_OK" = false ] || [ "$MEMBER_OK" = false ]; then
  echo ""
  echo "⚠️  Step 2: API疎通失敗 → ポート使用状況確認"
  
  # hotel-common
  if [ "$COMMON_OK" = false ]; then
    echo -n "  ポート 3400: "
    if lsof -ti:3400 > /dev/null 2>&1; then
      echo -e "${YELLOW}使用中（プロセス起動中だがAPI応答なし）${NC}"
      echo "    → hotel-commonのログを確認してください"
    else
      echo -e "${RED}未使用（起動が必要）${NC}"
      echo "    → cd /Users/kaneko/hotel-common && npm run dev"
    fi
  fi
  
  # hotel-saas
  if [ "$SAAS_OK" = false ]; then
    echo -n "  ポート 3100: "
    if lsof -ti:3100 > /dev/null 2>&1; then
      echo -e "${YELLOW}使用中（プロセス起動中だがAPI応答なし）${NC}"
      echo "    → hotel-saasのログを確認してください"
    else
      echo -e "${RED}未使用（起動が必要）${NC}"
      echo "    → cd /Users/kaneko/hotel-saas && npm run dev"
    fi
  fi
  
  # hotel-pms
  if [ "$PMS_OK" = false ]; then
    echo -n "  ポート 3300: "
    if lsof -ti:3300 > /dev/null 2>&1; then
      echo -e "${YELLOW}使用中（プロセス起動中だがAPI応答なし）${NC}"
      echo "    → hotel-pmsのログを確認してください"
    else
      echo -e "${RED}未使用（起動が必要）${NC}"
      echo "    → cd /Users/kaneko/hotel-pms && npm run dev"
    fi
  fi
  
  # hotel-member
  if [ "$MEMBER_OK" = false ]; then
    echo -n "  ポート 3200: "
    if lsof -ti:3200 > /dev/null 2>&1; then
      echo -e "${YELLOW}使用中（プロセス起動中だがAPI応答なし）${NC}"
      echo "    → hotel-memberのログを確認してください"
    else
      echo -e "${RED}未使用（起動が必要）${NC}"
      echo "    → cd /Users/kaneko/hotel-member && npm run dev"
    fi
  fi
else
  echo ""
  echo -e "${GREEN}✓ すべてのAPIが正常に応答しています${NC}"
  echo "  → ポート確認はスキップします（不要）"
fi

# ========================================
# 3. Redis接続確認
# ========================================

echo ""
echo "🔴 Step 3: Redis接続確認"
echo -n "  Redis (6379): "
if redis-cli ping > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 稼働中${NC}"
else
  echo -e "${RED}✗ 起動していません${NC}"
  echo "    → redis-server を起動してください"
fi

# ========================================
# 4. PostgreSQL接続確認
# ========================================

echo ""
echo "🐘 Step 4: PostgreSQL接続確認"
echo -n "  PostgreSQL: "
if psql -d hotel_unified_db -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 接続成功${NC}"
else
  echo -e "${RED}✗ 接続失敗${NC}"
  echo "    → PostgreSQLが起動しているか確認してください"
fi

# ========================================
# 5. テストデータ確認
# ========================================

echo ""
echo "📊 Step 5: テストデータ確認"

# テストテナント
echo -n "  テストテナント (default): "
TENANT_COUNT=$(psql -d hotel_unified_db -t -c "SELECT COUNT(*) FROM \"Tenant\" WHERE id = 'default';" 2>/dev/null | xargs)
if [ "$TENANT_COUNT" = "1" ]; then
  echo -e "${GREEN}✓ 存在${NC}"
else
  echo -e "${RED}✗ 不在${NC}"
  echo "    → テストテナントを作成してください"
fi

# テストアカウント
echo -n "  テストアカウント (admin@omotenasuai.com): "
STAFF_COUNT=$(psql -d hotel_unified_db -t -c "SELECT COUNT(*) FROM staff WHERE email = 'admin@omotenasuai.com';" 2>/dev/null | xargs)
if [ "$STAFF_COUNT" = "1" ]; then
  echo -e "${GREEN}✓ 存在${NC}"
else
  echo -e "${RED}✗ 不在${NC}"
  echo "    → テストアカウントを作成してください"
fi

# ========================================
# 6. 総合判定
# ========================================

echo ""
echo "========================================="
if [ "$COMMON_OK" = true ] && [ "$SAAS_OK" = true ] && [ "$PMS_OK" = true ] && [ "$MEMBER_OK" = true ]; then
  echo -e "${GREEN}✅ テスト環境は正常です。テストを実行できます。${NC}"
  exit 0
else
  echo -e "${RED}❌ テスト環境に問題があります。上記の指示に従って修正してください。${NC}"
  exit 1
fi
```

#### スクリプトの使用方法

```bash
# 実行権限付与（初回のみ）
chmod +x /Users/kaneko/hotel-kanri/scripts/verify-test-env.sh

# 検証実行
/Users/kaneko/hotel-kanri/scripts/verify-test-env.sh

# テスト実行前に必ず実行
/Users/kaneko/hotel-kanri/scripts/verify-test-env.sh && npm test
```

---

### 2. 個別検証（手動確認時）

#### 2.1 API疎通確認（最優先）

```bash
# hotel-common (3400)
curl -f http://localhost:3400/api/health
# 期待: {"status":"ok"} または 200 OK

# hotel-saas (3100)
curl -f http://localhost:3100/api/health
# 期待: {"status":"ok"} または 200 OK

# hotel-pms (3300)
curl -f http://localhost:3300/api/health
# 期待: {"status":"ok"} または 200 OK

# hotel-member (3200)
curl -f http://localhost:3200/api/health
# 期待: {"status":"ok"} または 200 OK
```

**✅ すべて成功**: テスト実行可能（ポート確認不要）  
**❌ 失敗あり**: 次のステップへ

#### 2.2 ポート使用状況確認（API疎通失敗時のみ）

```bash
# ポート使用状況確認
lsof -i:3100  # hotel-saas
lsof -i:3200  # hotel-member
lsof -i:3300  # hotel-pms
lsof -i:3400  # hotel-common

# 使用中の場合: プロセスは起動しているがAPI応答なし
#   → ログを確認してエラーを修正
# 未使用の場合: サーバー起動が必要
#   → 該当サーバーを起動
```

#### 2.3 Redis接続確認

```bash
# Redisが起動していることを確認
redis-cli ping
# 期待: PONG

# セッションが保存されていることを確認
redis-cli KEYS "hotel:session:*"
# 期待: hotel:session:{sessionId} が表示される
```

#### 2.4 PostgreSQL接続確認

```bash
# PostgreSQL接続確認
psql -d hotel_unified_db -c "SELECT 1"
# 期待: 1 (1 row)
```

#### 2.5 テストデータ確認

```bash
# テストテナント存在確認
psql -d hotel_unified_db -c "SELECT id, name FROM \"Tenant\" WHERE id = 'default';"
# 期待: default | テストホテルグループ

# テストアカウント存在確認
psql -d hotel_unified_db -c "SELECT email, name FROM staff WHERE email = 'admin@omotenasuai.com';"
# 期待: admin@omotenasuai.com | (名前)
```

---

### 3. ログイン動作確認（統合テスト）

```bash
# 1. hotel-saasが起動していることを確認（API疎通で確認済み）
curl -f http://localhost:3100/api/health

# 2. ブラウザでアクセス
# http://localhost:3100/admin/login

# 3. 以下の情報でログイン
# メール: admin@omotenasuai.com
# パスワード: admin123

# 4. ログイン成功を確認
# → 管理画面ダッシュボードが表示される
```

---

### 4. 効率的なテスト実行フロー

```bash
# ========================================
# 推奨フロー
# ========================================

# Step 1: 検証スクリプト実行（自動で全チェック）
/Users/kaneko/hotel-kanri/scripts/verify-test-env.sh

# Step 2: 検証成功後、テスト実行
npm test

# ========================================
# 従来の非効率なフロー（避けるべき）
# ========================================

# ❌ 毎回ポート確認してkill（無駄）
lsof -ti:3100 | xargs kill -9
lsof -ti:3200 | xargs kill -9
lsof -ti:3300 | xargs kill -9
lsof -ti:3400 | xargs kill -9

# ❌ 毎回サーバー再起動（無駄）
cd /Users/kaneko/hotel-saas && npm run dev &
cd /Users/kaneko/hotel-common && npm run dev &
# ... (時間の無駄)
```

---

## 🚫 禁止事項

### 🔴 Critical: 絶対に守ること

#### 1. テナントID `'default'` のハードコード禁止

```typescript
// ❌ 絶対禁止（これを書いた瞬間に本番障害）
const tenantId = 'default';
tenantId: user.tenant_id || 'default'
tenant_id: req.body.tenantId || 'default'

// パラメータのデフォルト値も禁止
function getRooms(tenantId: string = 'default') { }  // ❌

// DBスキーマのデフォルト値も禁止
tenantId String @default("default")  // ❌
```

**違反時の影響**:
- 開発環境: 正常動作（問題が隠れる）
- 本番環境: 全機能停止（ビジネスに損害）

**参照**: [SSOT_PRODUCTION_PARITY_RULES.md](./SSOT_PRODUCTION_PARITY_RULES.md)

#### 2. その他の禁止事項

- ❌ **独自のテストアカウントを各システムで作成すること**
  - このSSOTに記載されたアカウントのみを使用

- ❌ **テストアカウント情報を各システムのドキュメントに重複記載すること**
  - このSSOTへのリンクのみを記載

- ❌ **古いドキュメントのテスト情報を使用すること**
  - このSSOTが最高権威

- ❌ **本番環境でこれらのテストアカウントを使用すること**
  - 開発・テスト環境専用

- ❌ **テストアカウント情報を忘れること**
  - 各AI（Sun、Suno、Luna）は常にこのSSOTを参照

---

## 📊 データベーススキーマ

### staffテーブル（管理画面用アカウント）

```prisma
model Staff {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // bcryptハッシュ
  name      String?
  tenantId  String   @map("tenant_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  @@map("staff")
  @@index([tenantId])
  @@index([email])
}
```

### テストデータの存在確認

```sql
-- テストアカウントが存在することを確認
SELECT id, email, name, tenant_id 
FROM staff 
WHERE email = 'admin@omotenasuai.com';

-- テストテナントが存在することを確認
SELECT id, name 
FROM "Tenant" 
WHERE id = 'default';
```

---

## 🔧 トラブルシューティング

### 問題1: テストアカウントでログインできない

**原因**:
- テストアカウントがDBに存在しない
- パスワードが間違っている
- テナントIDが不一致

**対応策**:
```bash
# 1. テストアカウントの存在確認
psql -d hotel_unified_db -c "SELECT * FROM staff WHERE email = 'admin@omotenasuai.com';"

# 2. 存在しない場合は作成（hotel-commonで実行）
npm run db:seed-test

# 3. パスワードをリセット（必要に応じて）
# admin123 のbcryptハッシュを再設定
```

### 問題2: テナントIDが見つからない

**原因**:
- テストテナントがDBに存在しない

**対応策**:
```bash
# テストテナントを作成
psql -d hotel_unified_db -c "
  INSERT INTO \"Tenant\" (id, name, created_at, updated_at)
  VALUES ('default', 'テストホテルグループ', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
"
```

### 問題3: Redisにセッションが保存されない

**原因**:
- Redisが起動していない
- Redis接続設定が間違っている

**対応策**:
```bash
# Redisの起動確認
redis-cli ping

# 起動していない場合
redis-server

# 環境変数確認
echo $REDIS_URL
# 期待: redis://localhost:6379
```

---

## 📝 AI開発者への注意事項

### Sun（hotel-saas担当）
- 管理画面ログインテスト時は必ず `admin@omotenasuai.com` を使用
- 独自のテストアカウントを作成しない
- ログイン機能開発時はこのSSOTを参照

### Suno（hotel-member担当）
- テナントID `default` でテストデータをフィルタリング
- 独自のテストテナントを作成しない
- マルチテナント機能テスト時はこのSSOTを参照

### Luna（hotel-pms担当）
- 予約・客室データのテスト時は `tenant_id = 'default'` を使用
- 独自のテストテナントを作成しない
- フロント業務機能テスト時はこのSSOTを参照

### Iza（統合管理者）
- このSSOTを定期的にレビュー
- テスト情報の一貫性を維持
- 各AIがこのSSOTを参照しているか監視

---

## 🔄 更新履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2025-10-03 | 初版作成 | Iza |
| 1.1.0 | 2025-10-06 | **効率的テスト実行への改善**<br>- 検証方法セクションを全面改訂<br>- 基本原則追加: 無駄な再起動を避ける<br>- API疎通確認を最優先に変更<br>- 統合検証スクリプト追加（`verify-test-env.sh`）<br>- ポート確認はAPI疎通失敗時のみ実行<br>- 効率的なテスト実行フローを明記<br>- 従来の非効率なフローを「避けるべき」として明示 | Iza |

---

## 📚 参考資料

- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](./SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証の詳細
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント設計
- [/Users/kaneko/hotel-kanri/docs/01_systems/common/database/TEST_DATA_SETUP.md](/Users/kaneko/hotel-kanri/docs/01_systems/common/database/TEST_DATA_SETUP.md) - データセットアップ手順

---

**最終更新**: 2025年10月3日  
**作成者**: AI Assistant (Iza - 統合管理者)  
**レビュー**: ユーザー承認済み


