# 🗄️ Rebuild環境 データベースセットアップガイド

**最終更新**: 2025年11月5日  
**目的**: hotel-common-rebuild用の新規DB作成手順  
**対象DB**: `hotel_common`  
**確定URL**: `postgresql://kaneko@localhost:5432/hotel_common`

---

## 📊 DB構成の全体像

```
PostgreSQL (localhost:5432)
├─ 既存DB: hotel_unified_db  ← 既存環境（hotel-common:3400）
│  └─ 既存テーブル・データ（変更なし）
│
└─ 新規DB: hotel_common ← rebuild環境（hotel-common-rebuild:3401）
   └─ 新規テーブル・テストデータ（完全独立）
   └─ URL: postgresql://kaneko@localhost:5432/hotel_common
```

---

## 🎯 なぜ新規DBを作成するのか？

### 既存DB共有の問題点

❌ **既存環境と同じDBを使うと**:
- テストデータが既存DBを汚染する
- マイグレーション履歴の不整合が発生
- 既存環境への予期しない影響
- ロールバック時のデータ混在

### 新規DB使用のメリット

✅ **新規DBを使うと**:
- 既存環境への影響ゼロ
- データの完全分離
- マイグレーション履歴の整合性確保
- 安全なテスト・検証
- いつでも削除・再作成可能

---

## 🚀 セットアップ手順

### Step 1: 新規DB作成

**✅ 確定DB名**: `hotel_common`  
**✅ 確定URL**: `postgresql://kaneko@localhost:5432/hotel_common`

```bash
# PostgreSQLに接続（管理者権限）
psql -U kaneko postgres

# 新規DB作成（rebuild専用）
CREATE DATABASE hotel_common
  WITH OWNER = kaneko
  ENCODING = 'UTF8'
  LC_COLLATE = 'ja_JP.UTF-8'
  LC_CTYPE = 'ja_JP.UTF-8'
  TEMPLATE = template0;

# 確認
\l hotel_common

# 接続テスト
\c hotel_common

# 拡張機能の有効化（必要に応じて）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

# 終了
\q
```

**確認ポイント**:
- ✅ DBが作成された（hotel_common）
- ✅ エンコーディングがUTF-8
- ✅ 接続できる（`postgresql://kaneko@localhost:5432/hotel_common`）

---

### Step 2: hotel-common-rebuild の環境変数設定

```bash
cd /Users/kaneko/hotel-common-rebuild

# .env ファイルを確認・編集
cat .env
```

**必須設定**:

```bash
# ✅ 実際のDB URL（確定版）
DATABASE_URL=postgresql://kaneko@localhost:5432/hotel_common

# Redis（既存と分離）
REDIS_SESSION_PREFIX=rebuild:session:

# ポート（確定）
PORT=3401
```

**注意**: 
- DB名: `hotel_common`（rebuild専用の新規DB）
- ユーザー: `kaneko`（管理者権限）
- パスワード: なし（ローカル開発環境）
- **ポート: `3401`**（既存common:3400 + 1）

**重要**:
- `DATABASE_URL` は **hotel_common** を指定（rebuild専用DB）
- ユーザーは `kaneko`（管理者権限）
- Redisプレフィックスは `rebuild:session:` で既存と分離

---

### Step 3: Prismaスキーマの確認

```bash
cd /Users/kaneko/hotel-common-rebuild

# スキーマファイルを確認
cat prisma/schema.prisma | head -20
```

**確認ポイント**:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- ✅ `url = env("DATABASE_URL")` になっている
- ✅ 既存DBのハードコードがない

---

### Step 4: Prismaマイグレーション実行

```bash
cd /Users/kaneko/hotel-common-rebuild

# マイグレーション状態確認
npx prisma migrate status

# マイグレーション実行（新規DB）
npx prisma migrate deploy

# 結果確認
npx prisma migrate status
```

**期待される結果**:
```
✅ All migrations applied
Database schema is up to date!
```

**確認ポイント**:
- ✅ 全テーブルが作成された
- ✅ マイグレーション履歴が記録された
- ✅ エラーがない

---

### Step 5: テーブル確認

```bash
# PostgreSQLに接続（確定URL）
psql postgresql://kaneko@localhost:5432/hotel_common

# テーブル一覧確認
\dt

# 主要テーブルの確認
\d+ tenant
\d+ admin
\d+ staff
\d+ room_grades

# テーブル数確認
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

# 終了
\q
```

**期待される結果**:
- ✅ 68テーブル存在（_prisma_migrations除く）
- ✅ テーブル構造が正しい
- ✅ データは空（これから投入）

---

### Step 6: テストテナント作成

```bash
cd /Users/kaneko/hotel-common-rebuild

# Prisma Clientの生成
npx prisma generate

# Node.jsでテストテナント作成（スクリプト例）
node -e "
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      id: 'rebuild-test-tenant',
      name: 'Rebuild テストテナント',
      status: 'active',
      features: ['all'],
      settings: {}
    }
  });
  console.log('✅ テストテナント作成:', tenant);
  await prisma.\$disconnect();
})();
"
```

**確認**:
```bash
psql postgresql://kaneko@localhost:5432/hotel_common \
  -c "SELECT id, name, status FROM tenant;"
```

**期待される結果**:
```
         id          |          name           | status 
---------------------+-------------------------+--------
 rebuild-test-tenant | Rebuild テストテナント | active
```

---

### Step 7: スーパーアドミン作成

```bash
node -e "
const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

(async () => {
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.admin.create({
    data: {
      id: 'rebuild-admin-001',
      email: 'admin@rebuild.test',
      username: 'rebuild_admin',
      display_name: 'Rebuild Administrator',
      password_hash: passwordHash,
      admin_level: 'superadmin',
      accessible_group_ids: [],
      accessible_chain_ids: [],
      accessible_tenant_ids: ['rebuild-test-tenant'],
      is_active: true,
      updated_at: new Date()
    }
  });
  console.log('✅ スーパーアドミン作成:', admin);
  await prisma.\$disconnect();
})();
"
```

**確認**:
```bash
psql postgresql://kaneko@localhost:5432/hotel_common \
  -c "SELECT id, email, username, admin_level FROM admin;"
```

---

### Step 8: 動作確認

```bash
cd /Users/kaneko/hotel-common-rebuild

# サーバー起動（📌 ポート3401で起動）
npm run dev

# 別ターミナルで接続テスト
curl http://localhost:3401/health
```

**期待される結果**:
```json
{
  "status": "ok",
  "database": "connected",
  "port": 3401
}
```

**ポート確認**:
- ✅ hotel-common-rebuild: `http://localhost:3401`
- ✅ 既存 hotel-common: `http://localhost:3400`（同時起動可能）

---

## ✅ セットアップ完了チェックリスト

- [ ] 新規DB作成完了（**hotel_common**）
- [ ] .env ファイル設定完了（`postgresql://kaneko@localhost:5432/hotel_common`）
- [ ] Prismaマイグレーション完了（68テーブル）
- [ ] テストテナント作成完了（rebuild-test-tenant）
- [ ] スーパーアドミン作成完了
- [ ] hotel-common-rebuild 起動確認（port 3401）
- [ ] DB接続確認（health check）
- [ ] **Prisma Studio動作確認**（`npx prisma studio`）

---

## 🔄 DBリセット手順（必要時）

開発中、DBを初期状態に戻したい場合：

```bash
# DB削除
psql -U kaneko postgres -c "DROP DATABASE IF EXISTS hotel_common;"

# 再作成
psql -U kaneko postgres -c "CREATE DATABASE hotel_common WITH OWNER = kaneko ENCODING = 'UTF8' TEMPLATE = template0;"

# マイグレーション再実行
cd /Users/kaneko/hotel-common-rebuild
npx prisma migrate deploy

# テストデータ再投入
# （Step 6-7を再実行）
```

---

## 🚨 トラブルシューティング

### エラー: "database does not exist"

```bash
# 原因: DBが作成されていない
# 対処: Step 1を実行

psql -U kaneko postgres -c "CREATE DATABASE hotel_common;"
```

### エラー: "relation does not exist"

```bash
# 原因: マイグレーションが未実行
# 対処: Step 4を実行

cd /Users/kaneko/hotel-common-rebuild
npx prisma migrate deploy
```

### エラー: "connection refused"

```bash
# 原因: PostgreSQLが起動していない
# 対処: PostgreSQLを起動

brew services start postgresql@14
# または
pg_ctl -D /usr/local/var/postgres start
```

### .envファイルの確認

```bash
cd /Users/kaneko/hotel-common-rebuild

# DATABASE_URLを確認
cat .env | grep DATABASE_URL

# 正しい値（確定版）
# DATABASE_URL=postgresql://kaneko@localhost:5432/hotel_common
```

---

## 🎨 Prisma Studio の使用

**Prisma Studio**: GUIでDBを閲覧・編集できるツール

```bash
cd /Users/kaneko/hotel-common-rebuild

# Prisma Studio起動
npx prisma studio

# ブラウザが自動で開く: http://localhost:5555
```

**機能**:
- ✅ 全テーブルの閲覧
- ✅ データの検索・フィルタ
- ✅ レコードの追加・編集・削除
- ✅ リレーションの可視化
- ✅ SQL実行不要（GUIで完結）

**使用例**:
1. テストテナント確認: `tenant` テーブルを開く
2. スーパーアドミン確認: `admin` テーブルを開く
3. 客室グレード確認: `room_grades` テーブルを開く
4. 注文データ確認: `orders` → `order_items` リレーションを辿る

**注意**:
- 開発環境専用（本番では使用禁止）
- データ編集は慎重に（Undo不可）
- ポート5555が使用中の場合は別ポートで起動

---

## 📚 関連ドキュメント

- **OVERVIEW.md**: リビルドプロジェクト全体像
- **OPERATIONS.md**: 運用管理体制
- **REBUILD_PROGRESS.md**: 進捗管理

---

## 📝 メモ

### DB名の命名規則

- 既存DB: `hotel_unified_db`（既存環境）
- rebuild DB: `hotel_common`（rebuild専用）

**理由**: 
- 既存DBと完全分離
- シンプルな命名（hotel_common）
- 削除しても既存に影響なし
- 統合時に既存DBへ移行

**確定URL**: `postgresql://kaneko@localhost:5432/hotel_common`

### マイグレーション履歴の管理

- rebuild環境はクリーンなマイグレーション履歴から開始
- 既存環境のマイグレーション不整合は影響しない
- 統合時に既存環境へマイグレーション適用

---

**作成者**: Gatekeeper  
**最終更新**: 2025年11月5日

