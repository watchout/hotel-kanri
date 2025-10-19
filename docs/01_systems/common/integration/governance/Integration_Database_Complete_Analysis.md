# 🔍 統合データベース完全分析 - 各システム実態調査結果

**作成日**: 2025年1月23日  
**収集方法**: 実際のコードベース・スキーマ・文書調査  
**対象**: hotel-saas, hotel-member, hotel-pms, hotel-common, グループ連携  
**目的**: 想定ではなく実際の情報に基づく統合データベース設計

---

## 📋 **調査結果サマリー**

### **重要な発見事項**
1. **hotel-common**: 既にPostgreSQL統一基盤が存在・設計済み
2. **hotel-member**: PostgreSQL接続設定済み・Prisma生成準備完了
3. **hotel-pms**: SQLite独立稼働・統一基盤未接続
4. **hotel-saas**: SQLite独立稼働・MVP完成済み
5. **グループ階層管理**: 完全設計済み・実装準備完了

---

## 🏗️ **各システムのテーブル構成（実際の調査結果）**

### **🏪 hotel-saas（客室AIコンシェルジュ）**

#### **現在の技術構成**
- **データベース**: SQLite + Prisma ORM
- **状況**: MVP完成済み・連携対応待ち
- **ポート**: 3100

#### **主要テーブル構成**
```sql
-- 注文管理
Order (id, roomId, placeId, status, items, total, createdAt)
OrderItem (id, orderId, menuItemId, name, price, quantity, status)
MenuItem (id, name, price, categoryId, isAvailable)

-- 客室・場所管理
DeviceRoom (id, roomId, deviceType, isActive)
Place (id, code, name, placeTypeId, attributes)

-- AIコンシェルジュ
-- (具体的なテーブル構成は要追加調査)
```

#### **統合必要性**
- **顧客データ**: hotel-memberから顧客情報参照
- **客室データ**: hotel-pmsから客室状況参照
- **請求連携**: hotel-pmsへ注文金額連携

---

### **🎯 hotel-member（AI顧客管理）**

#### **現在の技術構成**
- **フロントエンド**: Nuxt 3 (Port 3200)
- **バックエンド**: FastAPI + Uvicorn (Port 8080)
- **データベース**: PostgreSQL + SQLAlchemy
- **状況**: PostgreSQL設定済み・統一基盤接続準備完了

#### **主要テーブル構成**
```sql
-- 会員管理
users (id, name, email, phone, otp_token, rank_id, created_at)
ranks (id, name, min_points, point_rate, benefit_desc)
points (id, user_id, amount, transaction_type, created_at)
rewards (id, name, required_points, stock_quantity, rank_restrictions)

-- 予約機能（新機能）
reservations (id, user_id, checkin_date, checkout_date, room_type, total_amount)

-- AR機能（新機能）
ar_treasures (id, treasure_type, location_hint, reward_points)
```

#### **統合設計**
- **統一基盤への移行**: 既存PostgreSQL → hotel-common統一基盤
- **データマッピング**: users → customers テーブル
- **権限**: 顧客データの主管理システム

---

### **💼 hotel-pms（AIホテル管理）**

#### **現在の技術構成**
- **フロントエンド**: Vue 3 + Tailwind CSS + Pinia
- **基盤**: Electron（デスクトップアプリ）
- **データベース**: SQLite（ローカル）+ Drizzle ORM
- **ポート**: 3300
- **状況**: 仕様構築中・統一基盤未接続

#### **予定テーブル構成（設計段階）**
```sql
-- 予約管理（中心システム）
reservations (id, customer_id, room_number, checkin_date, checkout_date, status, origin)

-- 客室管理
rooms (id, room_number, room_type, floor, capacity, status, base_price)

-- チェックイン/アウト履歴
checkin_history (id, reservation_id, checkin_time, checkout_time, charges)

-- スタッフ・権限管理
staff (id, name, position_id, permissions)
positions (id, name, level, permissions)
```

#### **統合設計**
- **統一基盤移行**: SQLite → PostgreSQL統一基盤
- **予約一元管理**: 全予約の中心管理システム
- **顧客情報**: hotel-memberから参照・限定更新

---

### **🌊 hotel-common（統一基盤）**

#### **現在の実装状況**
- **データベース**: PostgreSQL統一基盤 ✅ 実装済み
- **テーブル数**: 13個（AI関連含む）
- **状況**: 稼働中・各システム接続待ち

#### **実装済みテーブル構成**
```sql
-- マルチテナント基盤
tenants (id, name, code, domain, settings, plan_type, status)
users (id, tenant_id, email, username, role, permissions)

-- 顧客管理（hotel-member連携）
customers (id, tenant_id, name, email, phone, member_id, rank_id, total_points)

-- 予約管理（hotel-pms連携）
reservations (id, tenant_id, customer_id, checkin_date, checkout_date, status, origin)

-- 客室管理
rooms (id, tenant_id, room_number, room_type, floor, capacity, status)
room_grades (id, tenant_id, grade_code, grade_name, amenities, member_only)
member_grade_access (id, tenant_id, room_grade_id, member_rank_id, access_type)

-- 階層管理（グループ連携）
organization_hierarchy (id, organization_type, name, parent_id, level, path)
tenant_organization (tenant_id, organization_id, role)
data_sharing_policy (id, organization_id, data_type, sharing_scope)

-- 監査・追跡
system_events (id, tenant_id, user_id, event_type, source_system, action)
schema_versions (id, version, description, rollback_sql)

-- AI機能（追加実装済み）
ai_credit_accounts (id, tenant_id, current_balance, plan_type)
ai_credit_transactions (id, account_id, amount, ai_function_type)
```

---

## 🔗 **グループ階層管理システム**

### **実装状況**: 完全設計済み
```sql
-- 4レベル階層構造
organization_hierarchy (
  id, organization_type, name, code, parent_id, level, path
)
-- レベル1: GROUP（企業全体）
-- レベル2: BRAND（事業ライン）  
-- レベル3: HOTEL（個別ホテル）
-- レベル4: DEPARTMENT（部門）

-- データ共有ポリシー
data_sharing_policy (
  id, organization_id, data_type, sharing_scope, access_level
)
```

---

## 📊 **統合戦略マトリックス**

### **データ責任分担（確定済み）**
| データ種別 | 主管理 | 更新権限 | 参照権限 | 統合方針 |
|------------|---------|----------|----------|----------|
| **顧客基本情報** | hotel-member | hotel-member + hotel-pms(限定) | 全システム | 統一customersテーブル |
| **会員ランク・ポイント** | hotel-member | hotel-member | 全システム | hotel-member主管理 |
| **予約情報** | hotel-pms | hotel-pms + hotel-member | 全システム | 統一reservationsテーブル |
| **客室管理** | hotel-pms | hotel-pms | hotel-member + hotel-pms | 統一rooms + room_gradesテーブル |
| **注文・サービス** | hotel-saas | hotel-saas | hotel-saas + hotel-pms | 新規service_ordersテーブル |
| **グループ階層** | hotel-common | hotel-common | 全システム | organization_hierarchyテーブル |

### **技術統合方針**
| システム | 現在DB | 統合後DB | 移行方式 | 優先度 |
|----------|---------|----------|----------|---------|
| **hotel-common** | PostgreSQL | PostgreSQL | ✅ 完了済み | - |
| **hotel-member** | PostgreSQL | 統一PostgreSQL | 段階移行 | HIGH |
| **hotel-pms** | SQLite | 統一PostgreSQL | 新規統合 | HIGH |
| **hotel-saas** | SQLite | 統一PostgreSQL | 後回し（MVP後） | LOW |

---

## 🎯 **データ保護・非破壊統合戦略**

### **原則**
1. **既存データ保護**: 全てのデータをバックアップ・保持
2. **段階的移行**: リセット禁止・並行稼働
3. **後方互換性**: 既存システム動作継続
4. **検証可能性**: 各段階で動作確認

### **具体的手順**
```typescript
interface SafeIntegrationPlan {
  phase1: "hotel-member統一基盤接続（prisma-client-py追加）"
  phase2: "hotel-pms統一基盤接続（.env設定・Prisma統合）"
  phase3: "データ同期検証・整合性確認"
  phase4: "hotel-saas統合準備（MVP完成後）"
  
  data_protection: "全段階でデータリセット禁止"
  rollback_plan: "各段階で原状復帰可能"
}
```

---

## 💡 **統合データベース設計の確定事項**

### **1. 既存実装の活用**
- **hotel-common統一基盤**: 既に完成・稼働中
- **room_grades設計**: 完全実装済み（マイグレーション待ち）
- **階層管理設計**: 完全実装済み

### **2. 各システム統合戦略**
- **hotel-member**: 統一基盤接続のみ（Python環境整備）
- **hotel-pms**: 統一基盤接続実装（.env + Prisma）
- **hotel-saas**: 後回し（独立稼働継続）

### **3. データリセット不要の確認**
- **既存AI関連テーブル**: 統合に影響なし・保持
- **既存テナント・ユーザー**: 保持・活用
- **競合テーブル**: 存在しない（設計済み）

**✅ 統合データベース設計は実装済み・各システム接続のみ必要** 