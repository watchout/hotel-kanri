# 🏗️ リビルドプロジェクト・アーキテクチャ

**最終更新**: 2025年11月4日  
**目的**: 既存環境と新規環境の関係、リソース管理を明確化

---

## 📂 ディレクトリ構成

### 全体像

```
/Users/kaneko/
├─ hotel-kanri/              ← 共通（温存）★ SSOT・テンプレート・ドキュメント
│  ├─ docs/03_ssot/          ← SSOT参照（両環境で使用）
│  ├─ docs/rebuild/          ← リビルドドキュメント（このファイル）
│  ├─ templates/             ← CRUDテンプレート保管（Phase 1で作成）
│  └─ .cursor/prompts/       ← 実装プロンプト（両環境で使用）
│
├─ hotel-saas/               ← 既存（温存）
│  ├─ .git/ → origin         ← リモートリポジトリあり
│  ├─ .env (PORT=3100)       ← 既存ポート
│  └─ server/api/v1/admin/   ← 既存実装（エラー多数）
│
├─ hotel-common/             ← 既存（温存）
│  ├─ .git/ → origin         ← リモートリポジトリあり
│  ├─ .env (PORT=3400)       ← 既存ポート
│  └─ src/routes/            ← 既存実装（エラー多数）
│
├─ hotel-pms/                ← 既存（温存・今回対象外）
├─ hotel-member/             ← 既存（温存・今回対象外）
│
├─ hotel-saas-rebuild/       ← 新規実装 ★ここで作業
│  ├─ .git/ (ローカルのみ)   ← リモートなし（完全新規）
│  ├─ .env (PORT=3101)       ← 新規ポート（既存と競合回避）
│  └─ server/api/v1/admin/   ← 新規実装（テンプレートベース）
│
└─ hotel-common-rebuild/     ← 新規実装 ★ここで作業
   ├─ .git/ (ローカルのみ)   ← リモートなし（完全新規）
   ├─ .env (PORT=3401)       ← 新規ポート（既存と競合回避）
   └─ src/routes/            ← 新規実装（テンプレートベース）
```

---

## 🔄 リソース管理

### 共通リソース（両環境で使用）

| リソース | 場所 | 使用方法 |
|---------|------|---------|
| **SSOT** | `/Users/kaneko/hotel-kanri/docs/03_ssot/` | 既存・新規ともに参照 |
| **CRUDテンプレート** | `/Users/kaneko/hotel-kanri/templates/` | 新規実装で使用 |
| **実装プロンプト** | `/Users/kaneko/hotel-kanri/.cursor/prompts/` | 新規実装で使用 |
| **データベース** | PostgreSQL (localhost:5432) | **既存・新規ともに同じDB** ⚠️ |
| **Redis** | localhost:6379 | **既存・新規ともに同じRedis** ⚠️ |

---

## 🗄️ データベース管理（重要）

### データベース共有戦略

```
PostgreSQL (localhost:5432/hotel_db)
  ├─ 既存環境（hotel-saas:3100 + hotel-common:3400）
  │  └─ 既存データを使用
  │
  └─ 新規環境（hotel-saas-rebuild:3101 + hotel-common-rebuild:3401）
     └─ 同じデータベース、同じテーブルを使用
```

**⚠️ 注意点**:

1. **テーブルスキーマは変更しない**
   - Prismaスキーマは既存をそのまま使用
   - マイグレーションは実行しない
   - スキーマ変更が必要な場合は既存環境で実施

2. **データは共有される**
   - 新規環境で作成したデータは既存環境でも見える
   - 既存環境のデータは新規環境でも見える
   - テストデータは `test_` プレフィックスを付ける

3. **テナント分離**
   - 新規環境用のテストテナントを作成
   - `tenant_id = "rebuild-test-tenant"` で識別
   - 本番テナントには影響しない

### データベース接続設定

#### 既存環境（hotel-common/.env）

```bash
DATABASE_URL="postgresql://admin:password@localhost:5432/hotel_db"
```

#### 新規環境（hotel-common-rebuild/.env）

```bash
# 同じデータベース
DATABASE_URL="postgresql://admin:password@localhost:5432/hotel_db"
```

---

## 🔴 Redis管理

### Redisキー管理

```
Redis (localhost:6379)
  ├─ 既存環境のセッション: session:*
  └─ 新規環境のセッション: rebuild:session:*  ← プレフィックスで分離
```

**キープレフィックス戦略**:

- 既存環境: `session:{sessionId}`
- 新規環境: `rebuild:session:{sessionId}`

これにより、既存環境と新規環境のセッションが競合しない。

### Redis接続設定

#### 既存環境（hotel-common/.env）

```bash
REDIS_URL="redis://localhost:6379"
REDIS_SESSION_PREFIX="session:"
```

#### 新規環境（hotel-common-rebuild/.env）

```bash
REDIS_URL="redis://localhost:6379"
REDIS_SESSION_PREFIX="rebuild:session:"  ← プレフィックス変更
```

---

## 🌐 ポート番号管理

### ポート割り当て

| 環境 | hotel-saas | hotel-common |
|-----|-----------|-------------|
| **既存** | 3100 | 3400 |
| **新規** | 3101 | 3401 |

### 同時起動可能

```bash
# ターミナル1: 既存環境（温存）
cd /Users/kaneko/hotel-saas
npm run dev  # localhost:3100

# ターミナル2: 既存環境（温存）
cd /Users/kaneko/hotel-common
npm run dev  # localhost:3400

# ターミナル3: 新規環境
cd /Users/kaneko/hotel-saas-rebuild
npm run dev  # localhost:3101

# ターミナル4: 新規環境
cd /Users/kaneko/hotel-common-rebuild
npm run dev  # localhost:3401
```

**メリット**:
- 既存と新規を同時に動かして比較できる
- 既存環境を止めずに新規開発可能

---

## 📦 依存関係管理

### package.json

| 環境 | 方針 |
|-----|------|
| **既存** | そのまま（変更しない） |
| **新規** | 既存のpackage.jsonをコピーして使用 |

### node_modules

```bash
# 新規環境で依存関係インストール
cd /Users/kaneko/hotel-saas-rebuild
npm install

cd /Users/kaneko/hotel-common-rebuild
npm install
```

**注意**: 既存と新規で別々にnode_modulesを持つ（約500MB × 2）

---

## 🔄 Git管理

### リポジトリ構成

| 環境 | Gitリポジトリ | リモート | ブランチ |
|-----|-------------|---------|---------|
| **既存（hotel-saas）** | `.git/` → origin | あり（GitHub） | main |
| **既存（hotel-common）** | `.git/` → origin | あり（GitHub） | main |
| **新規（hotel-saas-rebuild）** | `.git/` ローカルのみ | **なし** | main |
| **新規（hotel-common-rebuild）** | `.git/` ローカルのみ | **なし** | main |

### メリット

1. **誤push防止**
   - 新規環境にはリモートなし
   - `git push` しても既存に影響しない

2. **完全分離**
   - 既存と新規が完全に独立
   - AIが間違えても既存に影響しない

3. **統合は手動**
   - 新規実装が成功したら手動でコピー
   - 失敗したら削除するだけ

---

## 🔐 認証・セッション管理

### Session認証（統一）

```
ユーザー
  ↓ ログイン
hotel-saas-rebuild:3101 (Cookie: hotel-session-id)
  ↓ callHotelCommonAPI（Cookie転送）
hotel-common-rebuild:3401
  ↓ sessionAuthMiddleware
Redis (rebuild:session:{sessionId})
```

**既存との違い**:
- Redisキープレフィックスが違う（`rebuild:session:`）
- 既存セッションと新規セッションが競合しない

---

## 📊 テスト環境管理

### テストテナント

新規環境専用のテストテナントを作成：

```sql
-- テストテナント作成（新規環境用）
INSERT INTO tenants (id, name, subdomain, created_at, updated_at)
VALUES (
  'rebuild-test-tenant',
  'リビルドテスト施設',
  'rebuild-test',
  NOW(),
  NOW()
);
```

### テストデータ命名規則

- グレード名: `test_グレード名`
- 客室名: `test_客室名`
- 顧客名: `test_顧客名`

**理由**: 本番データと区別しやすい

---

## 🔄 統合時のリソース移行

### Phase 4: 既存環境への統合

#### コード統合

```bash
# 1. バックアップ
cd /Users/kaneko/hotel-saas
git checkout -b backup-before-rebuild
git push origin backup-before-rebuild

# 2. 新規実装をコピー
cd /Users/kaneko/hotel-saas
git checkout main
rm -rf server/api/v1/admin/*
cp -r /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/* server/api/v1/admin/

git add .
git commit -m "リビルド: 新規実装を統合"
git push origin main
```

#### データベース

- **移行不要**（既に同じDBを使用している）
- テストデータを削除（`test_` プレフィックス）

#### Redis

- **移行不要**（統合後は既存のプレフィックスを使用）
- 新規環境のセッションは削除（`rebuild:session:*`）

#### 環境変数

```bash
# hotel-saas/.env
PORT=3100  # 3101 → 3100 に戻す

# hotel-common/.env
PORT=3400  # 3401 → 3400 に戻す
REDIS_SESSION_PREFIX="session:"  # rebuild:session: → session: に戻す
```

---

## 🗑️ クリーンアップ

### 統合完了後

```bash
# 新規環境ディレクトリを削除
rm -rf /Users/kaneko/hotel-saas-rebuild
rm -rf /Users/kaneko/hotel-common-rebuild

# テストデータ削除
psql -U admin -d hotel_db -c "DELETE FROM room_grades WHERE name LIKE 'test_%';"

# Redisテストセッション削除
redis-cli KEYS "rebuild:session:*" | xargs redis-cli DEL
```

---

## 📋 リソースチェックリスト

### 構築時（Phase 1）

- [ ] hotel-saas-rebuild ディレクトリ作成
- [ ] hotel-common-rebuild ディレクトリ作成
- [ ] ポート番号設定（3101, 3401）
- [ ] Redis プレフィックス設定（rebuild:session:）
- [ ] データベース接続確認
- [ ] テストテナント作成

### 開発時（Phase 2-3）

- [ ] SSOT参照（hotel-kanri経由）
- [ ] テンプレート使用（hotel-kanri/templates/）
- [ ] テストデータ命名規則遵守（test_プレフィックス）

### 統合時（Phase 4）

- [ ] バックアップ作成
- [ ] コードコピー
- [ ] ポート番号復元（3100, 3400）
- [ ] Redis プレフィックス復元（session:）
- [ ] テストデータ削除
- [ ] 新規環境ディレクトリ削除

---

## 🚨 注意事項

### やってはいけないこと

1. ❌ 新規環境で Prisma migrate 実行
   - 既存環境のDBが壊れる
   
2. ❌ 既存環境のコードを新規環境にコピー
   - エラーが混入する

3. ❌ 本番テナントでテスト
   - 本番データが汚れる

4. ❌ 新規環境から既存環境のAPIを呼ぶ
   - 混乱の原因

### やるべきこと

1. ✅ データベースは共有（同じDB使用）
2. ✅ Redisキーはプレフィックスで分離
3. ✅ テストデータは test_ プレフィックス
4. ✅ テストテナント使用（rebuild-test-tenant）

---

## 📞 問い合わせ

リソース管理で不明な点:
- Luna（設計・管理AI）に相談
- このドキュメント（ARCHITECTURE.md）を参照




