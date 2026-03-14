# 💰 SSOT: 会計・請求管理（テナント管理者向け）

**Doc-ID**: SSOT-ADMIN-BILLING-001  
**バージョン**: 1.0.0  
**作成日**: 2025年10月8日  
**ステータス**: 🔴 承認済み（最高権威）  
**所有者**: Luna（hotel-pms担当AI）

**関連SSOT**:
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_PRODUCTION_PARITY_RULES.md](../00_foundation/SSOT_PRODUCTION_PARITY_RULES.md) - 本番同等ルール
- [SSOT_ADMIN_STATISTICS_CORE.md](./SSOT_ADMIN_STATISTICS_CORE.md) - 基本統計（売上分析連携）
- [SSOT_ADMIN_SYSTEM_LOGS.md](./SSOT_ADMIN_SYSTEM_LOGS.md) - システムログ（監査ログ）

**関連ドキュメント**:
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/BILLING_MIGRATION_ANALYSIS.md` - セッション対応移行分析
- `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md` - DB命名規則 v3.0.0
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md` - APIルーティングガイドライン

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [必須要件（CRITICAL）](#必須要件critical)
4. [技術スタック](#技術スタック)
5. [データモデル](#データモデル)
6. [税金計算・通貨管理](#税金計算通貨管理)
7. [施設サービス管理](#施設サービス管理)
8. [会計処理フロー](#会計処理フロー)
9. [決済処理](#決済処理)
10. [返金・キャンセル処理](#返金キャンセル処理)
11. [会計修正・訂正処理](#会計修正訂正処理)
12. [レシート・領収書発行](#レシート領収書発行)
13. [割引・クーポン適用](#割引クーポン適用)
14. [API仕様](#api仕様)
15. [フロントエンド実装](#フロントエンド実装)
16. [データ分析との連携](#データ分析との連携)
17. [セキュリティ](#セキュリティ)
18. [実装状況](#実装状況)
19. [実装チェックリスト](#実装チェックリスト)

---

## 📖 概要

### 目的

hotel-saas単独での会計・請求機能の完全な仕様を定義する。客室からのルームサービス注文および施設利用料の会計処理、決済、レシート発行までの一連のフローを管理する。

### 基本方針

- **システム境界の厳守**: hotel-saasはプロキシのみ、DBアクセスはhotel-common経由
- **本番同等設計**: 開発環境でも本番と同じ実装（フォールバック禁止）
- **マルチテナント対応**: 全クエリに`tenant_id`フィルタ必須
- **マルチ通貨対応**: 導入先国別の通貨・税率設定
- **セッション対応**: `sessionId`ベース会計（`roomNumber`フォールバックあり）
- **監査証跡**: 全操作のログ記録（7年間保存）

### 適用範囲

#### 対象機能
- ✅ ルームサービス注文の会計処理
- ✅ 施設サービス利用料の会計（ホテル側で自由追加可能）
- ✅ 決済処理（現金、クレジットカード、後払い、複数決済方法併用）
- ✅ 請求書・レシート・領収書発行（多言語対応、適格請求書対応）
- ✅ 割引・クーポン適用
- ✅ 会計履歴管理・売上分析
- ✅ 返金・キャンセル処理（全額/部分/商品単位）
- ✅ 会計修正・訂正処理（監査証跡付き）

#### 対象外機能
- ❌ 宿泊料金管理（PMSの範囲）
- ❌ 予約管理システムとの連携（PMSの範囲）
- ❌ VOD視聴料（現状仕様に含まれていない）
- ❌ SaaSサブスクリプション料金の請求（スーパーアドミン機能）

---

## 🎯 スコープ

### 対象システム

- ✅ **hotel-saas**: メイン実装（UI + プロキシAPI）
- ✅ **hotel-common**: コア実装（API基盤 + データベース層）
- 🔄 **hotel-pms**: 将来連携（宿泊料金との統合精算）

### 機能範囲

| # | 機能 | 説明 | 実装状態 | 優先度 |
|:-:|:-----|:-----|:------:|:-----:|
| 1 | 会計処理 | 注文・施設利用料の請求書作成 | 🟢 部分実装 | 🔴 最高 |
| 2 | 決済処理 | 現金・カード決済、複数決済併用 | 🟢 部分実装 | 🔴 最高 |
| 3 | レシート発行 | レシート・領収書・適格請求書 | 🟢 部分実装 | 🔴 最高 |
| 4 | 施設サービス管理 | 施設利用料のCRUD | ❌ 未実装 | 🔴 最高 |
| 5 | 税金計算 | 標準税率・軽減税率・国別税率 | ❌ 未実装 | 🔴 最高 |
| 6 | 通貨管理 | マルチ通貨対応・為替レート | ❌ 未実装 | 🟡 高 |
| 7 | 返金処理 | 全額/部分/商品単位返金 | ❌ 未実装 | 🟡 高 |
| 8 | 会計修正 | 金額・項目の修正（監査証跡） | ❌ 未実装 | 🟡 高 |
| 9 | 割引・クーポン | 割引計算・クーポン適用 | 🟢 部分実装 | 🟢 中 |
| 10 | 売上分析 | 統計API連携 | 🟢 統計側実装 | 🟢 中 |

---

## ⚠️ 必須要件（CRITICAL）

### 1. システム境界の厳守

**絶対ルール**: hotel-saasは**絶対にPrismaを直接使用してはいけない**

```typescript
// ❌ 絶対禁止（hotel-saas内）
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const billings = await prisma.billing.findMany();

// ✅ 正しい実装（hotel-saas内）
const billings = await $fetch('http://localhost:3400/api/v1/accounting/billings', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 2. 本番同等実装の徹底

**絶対禁止**: フォールバック値、環境分岐、モックデータ

```typescript
// ❌ 絶対禁止パターン
const tenantId = session.tenantId || 'default';  // 本番で全滅
if (process.env.NODE_ENV === 'development') {    // 環境分岐禁止
  return mockData;
}

// ✅ 正しい実装
const tenantId = session.tenantId;
if (!tenantId) {
  throw createError({
    statusCode: 400,
    statusMessage: 'Tenant ID is required'
  });
}
```

### 3. マルチテナント分離

**絶対ルール**: 全てのデータベースクエリに`tenant_id`フィルタ必須

```typescript
// ❌ 絶対禁止
const billings = await prisma.billing.findMany();

// ✅ 正しい実装
const billings = await prisma.billing.findMany({
  where: { tenantId: session.tenantId }
});
```

### 4. 監査ログの記録

**絶対ルール**: 全ての会計操作をログに記録（7年間保存）

```typescript
// 必須ログ記録項目
{
  tenantId: string,
  operationType: 'CREATE' | 'UPDATE' | 'REFUND' | 'CORRECT',
  billingId: string,
  beforeValue: object | null,
  afterValue: object,
  performedBy: string,  // staffId
  performedAt: DateTime,
  reason: string | null
}
```

---

## 🛠️ 技術スタック

### フロントエンド

```typescript
const dependencies = {
  'vue': '^3.5.13',
  'nuxt': '^3.13.0',
  'typescript': '^5.6.3',
  'tailwindcss': '^3.4.16',
}
```

### バックエンド

#### hotel-saas（プロキシAPI）
- **サーバー**: Nuxt Nitro
- **ディレクトリ**: `/server/api/v1/admin/front-desk/`
- **認証**: Session認証（adminミドルウェア）
- **役割**: hotel-common APIへのプロキシ

**実装済みAPI**:
- `POST /api/v1/admin/front-desk/billing` - 会計処理

#### hotel-common（コアAPI）
- **サーバー**: Express.js
- **ディレクトリ**: `/src/routes/api/v1/accounting/`
- **認証**: Session認証（Redis共有）
- **役割**: データベースアクセス、会計計算

**実装済みAPI**:
- `POST /api/v1/accounting/invoices` - 請求書作成
- `POST /api/v1/accounting/payments` - 決済処理

### データベース

- **DBMS**: PostgreSQL（統一DB）
- **ORM**: Prisma 5.22+
- **スキーマ**: `/Users/kaneko/hotel-common/prisma/schema.prisma`
- **命名規則**: **新規テーブルはsnake_case必須**（DATABASE_NAMING_STANDARD.md v3.0.0準拠）

### セッションストア

- **Redis**: 必須（開発・本番共通）
- **接続**: 環境変数 `REDIS_URL`
- **キー形式**: `hotel:session:{sessionId}`

---

## 📊 データモデル

### 既存テーブル（再利用）

#### Billing（請求）

```prisma
// 既存テーブル（schema.prisma）
model Billing {
  id                String             @id @default(uuid())
  tenantId          String
  reservationId     String
  billingNumber     String
  status            BillingStatus      @default(PENDING)
  totalAmount       Decimal
  paidAmount        Decimal            @default(0)
  dueDate           DateTime?
  paymentMethod     PaymentMethod?
  paymentDate       DateTime?
  items             Json               // 請求項目
  notes             String?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  tenant            Tenant             @relation(fields: [tenantId], references: [id])
  reservation       Reservation        @relation(fields: [reservationId], references: [id])
  
  @@unique([tenantId, billingNumber])
  @@index([tenantId])
  @@index([reservationId])
  @@map("billings")
}

enum BillingStatus {
  PENDING
  PARTIAL
  PAID
  OVERDUE
  CANCELED
  REFUNDED
}

enum PaymentMethod {
  CASH
  CREDIT_CARD
  BANK_TRANSFER
  POINTS
  OTHER
}
```

**⚠️ 注意**: 既存の`Billing`テーブルは予約（Reservation）前提。hotel-saasでの利用には拡張が必要。

---

### 新規テーブル設計

#### 1. billing_items（請求明細）

```prisma
model BillingItem {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  billingId       String   @map("billing_id")
  
  // 商品情報
  itemType        String   @map("item_type")        // 'ORDER' | 'SERVICE' | 'FACILITY' | 'OTHER'
  itemId          String?  @map("item_id")          // 元の注文ID or サービスID
  itemName        String   @map("item_name")
  itemDescription String?  @map("item_description")
  
  // 数量・単価
  quantity        Int      @default(1)
  unitPrice       Decimal  @map("unit_price")
  subtotal        Decimal                           // quantity * unitPrice
  
  // 税金計算
  taxType         String   @map("tax_type")         // 'STANDARD' | 'REDUCED' | 'EXEMPT'
  taxRate         Decimal  @map("tax_rate")         // 請求時の税率（履歴保持）
  taxAmount       Decimal  @map("tax_amount")
  
  // 割引
  discountAmount  Decimal  @default(0) @map("discount_amount")
  discountReason  String?  @map("discount_reason")
  
  // 合計
  totalAmount     Decimal  @map("total_amount")     // subtotal + taxAmount - discountAmount
  
  // メタデータ
  metadata        Json?                             // 追加情報
  notes           String?
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // リレーション
  tenant  Tenant  @relation(fields: [tenantId], references: [id])
  billing Billing @relation(fields: [billingId], references: [id])
  
  @@index([tenantId, billingId])
  @@index([tenantId, itemType])
  @@map("billing_items")
}
```

---

#### 2. payments（決済記録）

```prisma
model Payment {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  billingId       String   @map("billing_id")
  
  // 決済情報
  paymentMethod   String   @map("payment_method")   // 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'POINTS' | 'OTHER'
  amount          Decimal                           // この決済方法での支払額
  
  // 現金決済用
  receivedAmount  Decimal? @map("received_amount")  // 受取金額
  changeAmount    Decimal? @map("change_amount")    // お釣り
  
  // カード決済用
  cardType        String?  @map("card_type")        // 'VISA' | 'MASTERCARD' | 'JCB' | 'AMEX' | etc.
  cardLast4       String?  @map("card_last4")       // カード下4桁
  authCode        String?  @map("auth_code")        // 承認番号
  
  // 決済ステータス
  status          String   @default("COMPLETED")    // 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELED'
  transactionId   String?  @map("transaction_id")   // 外部決済システムのID
  
  // 通貨情報
  currency        String   @default("JPY")          // 'JPY' | 'USD' | 'EUR' | etc.
  exchangeRate    Decimal? @map("exchange_rate")    // 為替レート（外貨の場合）
  
  // メタデータ
  metadata        Json?
  notes           String?
  
  // 決済者情報
  paidBy          String?  @map("paid_by")          // staffId
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // リレーション
  tenant  Tenant  @relation(fields: [tenantId], references: [id])
  billing Billing @relation(fields: [billingId], references: [id])
  
  @@index([tenantId, billingId])
  @@index([tenantId, paymentMethod, status])
  @@index([transactionId])
  @@map("payments")
}
```

---

#### 3. facility_services（施設サービスマスタ）

```prisma
model FacilityService {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  
  // サービス情報
  serviceName     String   @map("service_name")     // "ランドリー", "駐車場", "スパ", etc.
  serviceType     String   @map("service_type")     // 'TIME_BASED' | 'QUANTITY_BASED' | 'FIXED'
  description     String?
  
  // 料金設定
  basePrice       Decimal  @map("base_price")       // 基本料金
  unitType        String?  @map("unit_type")        // '時間', '回数', '固定', etc.
  
  // 税金設定
  taxType         String   @default("STANDARD") @map("tax_type")  // 'STANDARD' | 'REDUCED' | 'EXEMPT'
  taxRate         Decimal  @default(0.10) @map("tax_rate")
  
  // 管理フィールド
  isActive        Boolean  @default(true) @map("is_active")
  sortOrder       Int      @default(0) @map("sort_order")
  iconUrl         String?  @map("icon_url")
  category        String?                           // カテゴリ分類
  
  // メタデータ
  metadata        Json?
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // リレーション
  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId, isActive])
  @@index([tenantId, category])
  @@map("facility_services")
}
```

---

#### 4. billing_refunds（返金処理）

```prisma
model BillingRefund {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  billingId       String   @map("billing_id")
  paymentId       String?  @map("payment_id")       // 元の決済ID
  
  // 返金タイプ
  refundType      String   @map("refund_type")      // 'FULL' | 'PARTIAL' | 'ITEM'
  refundAmount    Decimal  @map("refund_amount")
  
  // 返金理由
  refundReason    String   @map("refund_reason")
  detailedReason  String?  @map("detailed_reason")
  
  // 返金方法
  refundMethod    String   @map("refund_method")    // 'CASH' | 'CREDIT_CARD' | 'POINTS' | 'BANK_TRANSFER'
  
  // 承認フロー
  status          String   @default("PENDING")      // 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  requestedBy     String   @map("requested_by")     // staffId
  approvedBy      String?  @map("approved_by")      // staffId
  approvedAt      DateTime? @map("approved_at")
  rejectedReason  String?  @map("rejected_reason")
  
  // 処理完了
  completedAt     DateTime? @map("completed_at")
  transactionId   String?   @map("transaction_id")  // 外部返金トランザクションID
  
  // メタデータ
  metadata        Json?
  notes           String?
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // リレーション
  tenant    Tenant    @relation(fields: [tenantId], references: [id])
  billing   Billing   @relation(fields: [billingId], references: [id])
  payment   Payment?  @relation(fields: [paymentId], references: [id])
  requester Staff     @relation("RefundRequester", fields: [requestedBy], references: [id])
  approver  Staff?    @relation("RefundApprover", fields: [approvedBy], references: [id])
  
  @@index([tenantId, status])
  @@index([tenantId, billingId])
  @@index([requestedBy])
  @@map("billing_refunds")
}
```

---

#### 5. billing_corrections（会計修正履歴）

```prisma
model BillingCorrection {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  billingId       String   @map("billing_id")
  
  // 修正タイプ
  correctionType  String   @map("correction_type")  // 'AMOUNT' | 'ITEM' | 'TAX' | 'DISCOUNT' | 'OTHER'
  
  // 修正内容
  beforeValue     Json     @map("before_value")     // 修正前の値
  afterValue      Json     @map("after_value")      // 修正後の値
  
  // 修正理由
  reason          String
  detailedReason  String?  @map("detailed_reason")
  
  // 修正者情報
  correctedBy     String   @map("corrected_by")     // staffId
  
  // メタデータ
  metadata        Json?
  
  createdAt       DateTime @default(now()) @map("created_at")
  
  // リレーション
  tenant    Tenant  @relation(fields: [tenantId], references: [id])
  billing   Billing @relation(fields: [billingId], references: [id])
  corrector Staff  @relation(fields: [correctedBy], references: [id])
  
  @@index([tenantId, billingId])
  @@index([tenantId, correctionType])
  @@index([correctedBy])
  @@map("billing_corrections")
}
```

---

#### 6. receipts（レシート・領収書）

```prisma
model Receipt {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  billingId       String   @map("billing_id")
  
  // レシートタイプ
  receiptType     String   @map("receipt_type")     // 'RECEIPT' | 'INVOICE' | 'STATEMENT'
  receiptNumber   String   @map("receipt_number")   // 連番
  
  // 宛名情報
  recipientName   String?  @map("recipient_name")
  recipientEmail  String?  @map("recipient_email")
  recipientPhone  String?  @map("recipient_phone")
  
  // 法的要件（日本）
  purpose         String?                           // 但し書き
  invoiceNumber   String?  @map("invoice_number")   // 適格請求書番号（インボイス制度）
  
  // フォーマット
  language        String   @default("ja")            // 'ja' | 'en' | 'zh' | etc.
  qrCode          String?  @map("qr_code")          // QRコードデータ
  pdfUrl          String?  @map("pdf_url")          // PDF URL（S3等）
  
  // 発行情報
  issuedAt        DateTime @default(now()) @map("issued_at")
  issuedBy        String?  @map("issued_by")        // staffId
  
  // 送信履歴
  emailSentAt     DateTime? @map("email_sent_at")
  emailSentTo     String?   @map("email_sent_to")
  
  // メタデータ
  metadata        Json?
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // リレーション
  tenant  Tenant  @relation(fields: [tenantId], references: [id])
  billing Billing @relation(fields: [billingId], references: [id])
  issuer  Staff?  @relation(fields: [issuedBy], references: [id])
  
  @@unique([tenantId, receiptNumber])
  @@index([tenantId, receiptType])
  @@index([billingId])
  @@map("receipts")
}
```

---

## 💱 税金計算・通貨管理

### テナント設定（通貨・税率）

```prisma
// 既存の TenantSettings に追加
model TenantSettings {
  id              String   @id @default(uuid())
  tenantId        String   @unique @map("tenant_id")
  
  // 通貨設定
  defaultCurrency String   @default("JPY") @map("default_currency")
  // 'JPY' | 'USD' | 'EUR' | 'GBP' | 'INR' | 'CNY' | etc.
  
  // 税率設定（国別）
  standardTaxRate Decimal  @default(0.10) @map("standard_tax_rate")  // 標準税率
  reducedTaxRate  Decimal  @default(0.08) @map("reduced_tax_rate")   // 軽減税率
  
  // 国・地域情報
  country         String   @default("JP")           // ISO 3166-1 alpha-2
  timezone        String   @default("Asia/Tokyo")
  
  // 税金表示方式
  taxDisplayMode  String   @default("INCLUDED") @map("tax_display_mode")  // 'INCLUDED' | 'EXCLUDED'
  
  // 適格請求書（インボイス制度）
  invoiceNumber   String?  @map("invoice_number")   // 適格請求書発行事業者番号
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  @@map("tenant_settings")
}
```

---

### 通貨マスタ

```prisma
model Currency {
  code            String   @id                      // 'JPY', 'USD', 'INR', etc.
  name            String                            // '日本円', 'US Dollar', etc.
  symbol          String                            // '¥', '$', '₹', etc.
  decimalPlaces   Int      @default(0)              // 小数点以下桁数（円:0, ドル:2）
  isActive        Boolean  @default(true) @map("is_active")
  
  // 国別デフォルト設定
  countries       Json     @default("[]")           // ['JP', 'US', 'IN']
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  @@map("currencies")
}
```

**初期データ**:
```json
[
  { "code": "JPY", "name": "日本円", "symbol": "¥", "decimalPlaces": 0, "countries": ["JP"] },
  { "code": "USD", "name": "US Dollar", "symbol": "$", "decimalPlaces": 2, "countries": ["US"] },
  { "code": "INR", "name": "Indian Rupee", "symbol": "₹", "decimalPlaces": 2, "countries": ["IN"] },
  { "code": "EUR", "name": "Euro", "symbol": "€", "decimalPlaces": 2, "countries": ["DE", "FR", "IT", "ES"] },
  { "code": "GBP", "name": "British Pound", "symbol": "£", "decimalPlaces": 2, "countries": ["GB"] },
  { "code": "CNY", "name": "Chinese Yuan", "symbol": "¥", "decimalPlaces": 2, "countries": ["CN"] }
]
```

---

### 税率履歴管理

```prisma
model TaxRateHistory {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  
  // 税率タイプ
  taxType         String   @map("tax_type")         // 'STANDARD' | 'REDUCED'
  taxRate         Decimal  @map("tax_rate")
  
  // 有効期間
  effectiveFrom   DateTime @map("effective_from")   // 適用開始日
  effectiveTo     DateTime? @map("effective_to")    // 適用終了日（NULL=現在有効）
  
  // 変更理由
  reason          String?                           // 変更理由（法改正等）
  changedBy       String?  @map("changed_by")       // staffId
  
  createdAt       DateTime @default(now()) @map("created_at")
  
  // リレーション
  tenant  Tenant @relation(fields: [tenantId], references: [id])
  changer Staff? @relation(fields: [changedBy], references: [id])
  
  @@index([tenantId, effectiveFrom])
  @@index([tenantId, effectiveTo])
  @@index([tenantId, taxType, effectiveFrom])
  @@map("tax_rate_history")
}
```

**税率取得ロジック**:
```typescript
async function getTaxRate(
  tenantId: string,
  taxType: 'STANDARD' | 'REDUCED',
  date: Date = new Date()
): Promise<Decimal> {
  const history = await prisma.taxRateHistory.findFirst({
    where: {
      tenantId,
      taxType,
      effectiveFrom: { lte: date },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: date } }
      ]
    },
    orderBy: { effectiveFrom: 'desc' }
  });
  
  if (history) {
    return history.taxRate;
  }
  
  // デフォルト値（テナント設定から取得）
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId }
  });
  
  return taxType === 'STANDARD' 
    ? settings.standardTaxRate 
    : settings.reducedTaxRate;
}
```

---

## 🏢 施設サービス管理

### 概要

ホテル管理者が自由に施設サービス（ランドリー、駐車場、スパ等）を追加・編集できる汎用的な設計。

### 料金タイプ

| タイプ | 説明 | 単位例 |
|--------|------|--------|
| `TIME_BASED` | 時間課金 | 1時間あたり |
| `QUANTITY_BASED` | 回数課金 | 1回あたり |
| `FIXED` | 固定料金 | 1利用あたり |

### 税率タイプ

| タイプ | 税率 | 適用例 |
|--------|------|--------|
| `STANDARD` | 10%（日本） | ホテル内飲食、施設利用 |
| `REDUCED` | 8%（日本） | 食品・飲料（テイクアウト） |
| `EXEMPT` | 0% | 非課税サービス |

### UI実装

#### 管理画面パス
`/admin/settings/facility-services`

#### 機能
- ✅ 施設サービス一覧表示
- ✅ 新規追加
- ✅ 編集
- ✅ 削除（論理削除）
- ✅ 並び順変更（ドラッグ&ドロップ）
- ✅ カテゴリ別フィルタ

---

## 💳 会計処理フロー

### セッション対応会計フロー

```typescript
// 会計処理の全体フロー
async function processBilling(billingData: BillingData) {
  // Step 1: セッション情報取得
  const { getActiveSessionByRoom } = useSessionApi();
  const activeSession = await getActiveSessionByRoom(billingData.roomNumber);
  
  if (!activeSession) {
    // フォールバック: 部屋番号ベース会計
    return await processLegacyBilling(billingData);
  }
  
  // Step 2: 請求書作成（hotel-common API）
  const invoice = await createInvoice({
    tenantId: session.tenantId,
    sessionId: activeSession.id,
    sessionNumber: activeSession.sessionNumber,
    customerName: activeSession.primaryGuestName,
    customerEmail: activeSession.primaryGuestEmail,
    items: billingData.items,
    totalAmount: billingData.totalAmount,
    taxAmount: billingData.taxAmount,
    currency: session.defaultCurrency
  });
  
  // Step 3: 決済処理
  const payment = await processPayment({
    tenantId: session.tenantId,
    billingId: invoice.id,
    paymentMethod: billingData.paymentMethod,
    amount: billingData.totalAmount,
    receivedAmount: billingData.receivedAmount,
    changeAmount: billingData.changeAmount
  });
  
  // Step 4: セッション会計状況更新
  await updateSessionBilling(activeSession.id, {
    totalAmount: activeSession.totalAmount + billingData.totalAmount,
    paidAmount: activeSession.paidAmount + billingData.totalAmount,
    billingStatus: 'COMPLETED'
  });
  
  // Step 5: レシート発行
  const receipt = await generateReceipt({
    billingId: invoice.id,
    receiptType: 'RECEIPT',
    language: billingData.language || 'ja'
  });
  
  // Step 6: 監査ログ記録
  await logBillingOperation({
    tenantId: session.tenantId,
    operationType: 'CREATE',
    billingId: invoice.id,
    performedBy: session.user.id,
    metadata: { sessionId: activeSession.id }
  });
  
  return {
    success: true,
    invoice,
    payment,
    receipt
  };
}
```

---

## 💰 決済処理

### 単一決済方法

```typescript
interface SinglePayment {
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'POINTS';
  amount: Decimal;
  receivedAmount?: Decimal;  // 現金の場合
  changeAmount?: Decimal;    // お釣り
  cardType?: string;         // カードの場合
  cardLast4?: string;        // カード下4桁
}
```

### 複数決済方法併用

```typescript
interface MultiplePayments {
  payments: Array<{
    paymentMethod: string;
    amount: Decimal;
    // 各決済方法固有の情報
  }>;
  totalAmount: Decimal;
}

// 使用例: 現金5,000円 + カード3,000円
{
  payments: [
    { paymentMethod: 'CASH', amount: 5000, receivedAmount: 5000, changeAmount: 0 },
    { paymentMethod: 'CREDIT_CARD', amount: 3000, cardType: 'VISA', cardLast4: '1234' }
  ],
  totalAmount: 8000
}
```

---

## 🔄 返金・キャンセル処理

### 返金タイプ

| タイプ | 説明 |
|--------|------|
| `FULL` | 全額返金 |
| `PARTIAL` | 部分返金（金額指定） |
| `ITEM` | 商品単位返金（特定商品のみ） |

### 承認フロー

```
返金申請 → 承認待ち → 承認/却下 → 処理完了
(PENDING)  (PENDING)   (APPROVED/    (COMPLETED)
                       REJECTED)
```

### API仕様

**POST /api/v1/admin/billing/refunds**

```typescript
// リクエスト
{
  billingId: string,
  refundType: 'FULL' | 'PARTIAL' | 'ITEM',
  refundAmount: number,
  refundReason: string,
  detailedReason?: string,
  itemIds?: string[]  // ITEM タイプの場合
}

// レスポンス
{
  success: true,
  data: {
    refund: {
      id: string,
      status: 'PENDING',
      refundAmount: number,
      createdAt: string
    }
  }
}
```

---

## ✏️ 会計修正・訂正処理

### 修正タイプ

| タイプ | 説明 |
|--------|------|
| `AMOUNT` | 金額修正 |
| `ITEM` | 項目追加・削除 |
| `TAX` | 税額修正 |
| `DISCOUNT` | 割引修正 |
| `OTHER` | その他 |

### 監査証跡

```typescript
interface BillingCorrectionLog {
  correctionType: string,
  beforeValue: {
    totalAmount?: Decimal,
    items?: Array<any>,
    taxAmount?: Decimal
  },
  afterValue: {
    totalAmount?: Decimal,
    items?: Array<any>,
    taxAmount?: Decimal
  },
  reason: string,
  correctedBy: string,  // staffId
  correctedAt: DateTime
}
```

---

## 🧾 レシート・領収書発行

### レシートタイプ

| タイプ | 説明 | 用途 |
|--------|------|------|
| `RECEIPT` | レシート | 通常の会計 |
| `INVOICE` | 領収書 | 宛名・但し書き付き |
| `STATEMENT` | 明細書 | 詳細な請求明細 |

### 多言語対応

サポート言語: `ja`, `en`, `zh`, `ko`, `es`, `fr`, `de`

### 適格請求書（インボイス制度）

```typescript
interface QualifiedInvoice {
  invoiceNumber: string,      // 適格請求書発行事業者番号
  recipientName: string,      // 宛名
  issuedDate: Date,           // 発行日
  items: Array<{
    name: string,
    quantity: number,
    unitPrice: Decimal,
    taxRate: Decimal,
    taxAmount: Decimal
  }>,
  totalTaxByRate: {           // 税率ごとの合計
    '10%': Decimal,
    '8%': Decimal
  }
}
```

### QRコード

```typescript
// QRコード内容（電子レシート用）
{
  receiptId: string,
  receiptNumber: string,
  totalAmount: number,
  issuedAt: string,
  verificationUrl: string  // レシート検証URL
}
```

---

## 🎟️ 割引・クーポン適用

### 割引タイプ

| タイプ | 説明 |
|--------|------|
| `PERCENTAGE` | パーセント割引（10%off等） |
| `FIXED_AMOUNT` | 固定額割引（500円off等） |
| `ITEM_DISCOUNT` | 商品単位割引 |
| `BUNDLE_DISCOUNT` | セット割引 |

### クーポン適用ロジック

```typescript
function applyDiscount(
  items: BillingItem[],
  discount: Discount
): BillingItem[] {
  switch (discount.type) {
    case 'PERCENTAGE':
      return items.map(item => ({
        ...item,
        discountAmount: item.subtotal * (discount.value / 100),
        totalAmount: item.subtotal - (item.subtotal * (discount.value / 100))
      }));
    
    case 'FIXED_AMOUNT':
      const totalSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const discountRatio = discount.value / totalSubtotal;
      return items.map(item => ({
        ...item,
        discountAmount: item.subtotal * discountRatio,
        totalAmount: item.subtotal - (item.subtotal * discountRatio)
      }));
    
    // ...
  }
}
```

---

## 🔌 API仕様

### 会計処理API

**POST /api/v1/admin/front-desk/billing**

**リクエスト**:
```typescript
{
  // セッション情報（優先）
  sessionId?: string,
  
  // フォールバック
  roomNumber?: string,
  
  // 注文・サービス情報
  items: Array<{
    itemType: 'ORDER' | 'SERVICE' | 'FACILITY',
    itemId: string,
    itemName: string,
    quantity: number,
    unitPrice: number,
    taxType: 'STANDARD' | 'REDUCED' | 'EXEMPT'
  }>,
  
  // 金額情報
  subtotal: number,
  taxAmount: number,
  discountAmount: number,
  totalAmount: number,
  
  // 決済情報
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'POINTS',
  receivedAmount?: number,
  changeAmount?: number,
  
  // その他
  includeCheckout?: boolean,  // チェックアウト含む
  notes?: string,
  currency?: string
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    billing: {
      id: string,
      billingNumber: string,
      totalAmount: number,
      status: 'PAID'
    },
    payment: {
      id: string,
      amount: number,
      paymentMethod: string
    },
    receipt: {
      id: string,
      receiptNumber: string,
      pdfUrl: string
    },
    session: {
      id: string,
      sessionNumber: string,
      checkoutCompleted: boolean
    }
  }
}
```

---

### 請求書一覧取得API

**GET /api/v1/admin/billing/list**

**クエリパラメータ**:
```typescript
{
  startDate?: string,  // YYYY-MM-DD
  endDate?: string,
  status?: 'PENDING' | 'PAID' | 'CANCELED' | 'REFUNDED',
  paymentMethod?: string,
  page?: number,
  limit?: number
}
```

---

### 返金申請API

**POST /api/v1/admin/billing/refunds**

（詳細は「返金・キャンセル処理」セクション参照）

---

### 会計修正API

**POST /api/v1/admin/billing/corrections**

**リクエスト**:
```typescript
{
  billingId: string,
  correctionType: 'AMOUNT' | 'ITEM' | 'TAX' | 'DISCOUNT',
  beforeValue: object,
  afterValue: object,
  reason: string,
  detailedReason?: string
}
```

---

### レシート発行API

**POST /api/v1/admin/billing/receipts**

**リクエスト**:
```typescript
{
  billingId: string,
  receiptType: 'RECEIPT' | 'INVOICE' | 'STATEMENT',
  recipientName?: string,
  purpose?: string,  // 但し書き
  language?: string,
  sendEmail?: boolean,
  emailAddress?: string
}
```

---

### 施設サービス管理API

**GET /api/v1/admin/settings/facility-services**

施設サービス一覧取得

**POST /api/v1/admin/settings/facility-services**

施設サービス新規作成

**PUT /api/v1/admin/settings/facility-services/[id]**

施設サービス更新

**DELETE /api/v1/admin/settings/facility-services/[id]**

施設サービス削除（論理削除）

---

## 🖥️ フロントエンド実装

### ディレクトリ構成

```
/pages/admin/
  ├─ front-desk/
  │   ├─ cash-register.vue          # 会計処理画面（実装済み）
  │   ├─ billing-history.vue        # 会計履歴
  │   └─ refund-requests.vue        # 返金申請管理
  │
  ├─ billing/
  │   ├─ index.vue                  # 請求書一覧
  │   ├─ [id].vue                   # 請求書詳細
  │   └─ corrections.vue            # 修正履歴
  │
  └─ settings/
      ├─ facility-services/
      │   ├─ index.vue              # 施設サービス一覧
      │   └─ [id].vue               # 施設サービス編集
      │
      └─ billing-settings.vue       # 会計設定（税率、通貨等）
```

---

### Composables

```
/composables/
  ├─ useBilling.ts                  # 会計処理
  ├─ usePayment.ts                  # 決済処理
  ├─ useRefund.ts                   # 返金処理
  ├─ useReceipt.ts                  # レシート発行
  ├─ useFacilityServices.ts         # 施設サービス管理
  └─ useTaxCalculation.ts           # 税金計算
```

---

### 実装例: 会計処理画面

**ファイル**: `/pages/admin/front-desk/cash-register.vue`

**機能**:
- ✅ 部屋番号入力
- ✅ 注文一覧表示
- ✅ 施設サービス追加
- ✅ 割引適用
- ✅ 税金計算（自動）
- ✅ 決済方法選択
- ✅ 現金決済時のお釣り計算
- ✅ レシート印刷

**主要コンポーネント**:
```vue
<template>
  <div class="cash-register">
    <RoomSelector v-model="roomNumber" />
    <OrderList :orders="orders" />
    <FacilityServiceSelector @add="addService" />
    <DiscountInput v-model="discount" />
    <TaxSummary :items="items" :taxRates="taxRates" />
    <PaymentMethodSelector v-model="paymentMethod" />
    <CashInput v-if="paymentMethod === 'CASH'" v-model="receivedAmount" />
    <TotalAmount :total="total" :change="change" />
    <ActionButtons @process="processBilling" @cancel="cancel" />
  </div>
</template>
```

---

## 🔗 データ分析との連携

### イベント駆動連携

```typescript
// 会計完了時のイベント発行
await publishEvent('billing.completed', {
  tenantId: session.tenantId,
  billingId: billing.id,
  totalAmount: billing.totalAmount,
  items: billing.items,
  paymentMethod: payment.paymentMethod,
  timestamp: new Date()
});

// 返金完了時のイベント発行
await publishEvent('billing.refunded', {
  tenantId: session.tenantId,
  billingId: billing.id,
  refundAmount: refund.refundAmount,
  refundType: refund.refundType,
  timestamp: new Date()
});

// 会計修正時のイベント発行
await publishEvent('billing.corrected', {
  tenantId: session.tenantId,
  billingId: billing.id,
  correctionType: correction.correctionType,
  beforeValue: correction.beforeValue,
  afterValue: correction.afterValue,
  timestamp: new Date()
});
```

---

### 統計API連携

**SSOT_ADMIN_STATISTICS_CORE.md** との連携

- `GET /api/v1/admin/statistics/billing-summary` - 会計サマリー
- `GET /api/v1/admin/statistics/revenue-analysis` - 施設サービス別売上分析
- `GET /api/v1/admin/statistics/payment-methods` - 決済方法別分析

**データフロー**:
```
┌─────────────────┐
│ 会計処理        │
│ (Billing)       │
└────────┬────────┘
         │ billing.completed event
         ↓
┌─────────────────┐
│ 統計集計        │
│ (Statistics)    │
│ - 売上合計      │
│ - 商品別売上    │
│ - 時間帯分析    │
│ - 客室別利用    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ AI分析          │
│ (AI Insights)   │
│ - 異常検知      │
│ - 需要予測      │
│ - トレンド分析  │
└─────────────────┘
```

---

## 🔒 セキュリティ

### 1. テナント分離の徹底

```typescript
// ✅ 正しい実装
const billings = await prisma.billing.findMany({
  where: { tenantId: session.tenantId }
});

// ❌ 絶対禁止
const billings = await prisma.billing.findMany();
```

---

### 2. 権限チェック

```typescript
// 会計修正権限チェック
if (!hasPermission(session.user, 'billing:correct')) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Permission denied'
  });
}

// 返金承認権限チェック
if (!hasPermission(session.user, 'billing:refund:approve')) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Refund approval permission required'
  });
}
```

---

### 3. 監査ログ

```typescript
// 全ての会計操作をログに記録
await logAuditLog({
  tenantId: session.tenantId,
  operationType: 'BILLING_CREATE',
  resourceType: 'billing',
  resourceId: billing.id,
  performedBy: session.user.id,
  ipAddress: event.node.req.socket.remoteAddress,
  userAgent: event.node.req.headers['user-agent'],
  metadata: {
    totalAmount: billing.totalAmount,
    paymentMethod: payment.paymentMethod
  }
});
```

---

### 4. 決済情報の保護

```typescript
// カード情報の保護
{
  cardType: 'VISA',
  cardLast4: '1234',  // 下4桁のみ保存
  // ❌ cardNumber: '1234-5678-9012-3456'  // 絶対禁止
}

// 決済ゲートウェイの利用
// カード情報は外部決済システムで処理
// hotel-kanriには保存しない
```

---

## 📊 実装状況

### 実装済み機能

| 機能 | ファイル | 説明 |
|-----|---------|------|
| 会計処理API | `/server/api/v1/admin/front-desk/billing.post.ts` | 基本的な会計処理 |
| 請求書作成 | hotel-common `/api/v1/accounting/invoices` | 請求書生成 |
| 決済処理 | hotel-common `/api/v1/accounting/payments` | 決済記録 |
| 会計画面 | `/pages/admin/front-desk/cash-register.vue` | UI実装済み |

---

### 未実装機能

| 機能 | 優先度 | 工数 |
|-----|:-----:|:----:|
| 施設サービス管理 | 🔴 最高 | 2日 |
| 税金計算（軽減税率対応） | 🔴 最高 | 1日 |
| 通貨管理・為替レート | 🟡 高 | 2日 |
| 返金処理（承認フロー） | 🟡 高 | 2日 |
| 会計修正（監査証跡） | 🟡 高 | 1日 |
| 適格請求書対応 | 🟡 高 | 1日 |
| 複数決済方法併用 | 🟢 中 | 1日 |
| QRコード電子レシート | 🟢 中 | 1日 |

---

## ✅ 実装チェックリスト

### Phase 1: 基本会計機能（2週間）

#### データベース
- [ ] `billing_items` テーブル作成
- [ ] `payments` テーブル作成
- [ ] `facility_services` テーブル作成
- [ ] `receipts` テーブル作成
- [ ] Prismaマイグレーション実行

#### hotel-common API
- [ ] `POST /api/v1/accounting/billing-items` - 明細追加
- [ ] `GET /api/v1/accounting/billings/[id]` - 請求書詳細
- [ ] `POST /api/v1/accounting/payments/multiple` - 複数決済
- [ ] `POST /api/v1/accounting/receipts` - レシート発行
- [ ] `GET /api/v1/admin/facility-services` - 施設サービス一覧
- [ ] `POST /api/v1/admin/facility-services` - 施設サービス作成

#### hotel-saas API（プロキシ）
- [ ] `/server/api/v1/admin/billing/list.get.ts` - 請求書一覧
- [ ] `/server/api/v1/admin/billing/[id].get.ts` - 請求書詳細
- [ ] `/server/api/v1/admin/billing/receipts.post.ts` - レシート発行
- [ ] `/server/api/v1/admin/settings/facility-services.get.ts` - 施設サービス一覧
- [ ] `/server/api/v1/admin/settings/facility-services.post.ts` - 施設サービス作成

#### UI実装
- [ ] `/pages/admin/billing/index.vue` - 請求書一覧画面
- [ ] `/pages/admin/billing/[id].vue` - 請求書詳細画面
- [ ] `/pages/admin/settings/facility-services/index.vue` - 施設サービス管理画面
- [ ] `/composables/useBilling.ts` - 会計処理Composable
- [ ] `/composables/useFacilityServices.ts` - 施設サービスComposable

---

### Phase 2: 税金・通貨対応（1週間）

#### データベース
- [ ] `currencies` テーブル作成
- [ ] `tax_rate_history` テーブル作成
- [ ] `tenant_settings` に通貨・税率フィールド追加

#### API実装
- [ ] 税金計算ロジック実装（標準税率・軽減税率）
- [ ] 通貨変換ロジック実装
- [ ] 税率履歴管理API

#### UI実装
- [ ] `/pages/admin/settings/billing-settings.vue` - 税率・通貨設定画面
- [ ] `/composables/useTaxCalculation.ts` - 税金計算Composable

---

### Phase 3: 返金・修正機能（1週間）

#### データベース
- [ ] `billing_refunds` テーブル作成
- [ ] `billing_corrections` テーブル作成

#### API実装
- [ ] `POST /api/v1/admin/billing/refunds` - 返金申請
- [ ] `PUT /api/v1/admin/billing/refunds/[id]/approve` - 返金承認
- [ ] `POST /api/v1/admin/billing/corrections` - 会計修正

#### UI実装
- [ ] `/pages/admin/front-desk/refund-requests.vue` - 返金申請管理
- [ ] `/pages/admin/billing/corrections.vue` - 修正履歴
- [ ] `/composables/useRefund.ts` - 返金Composable

---

### Phase 4: レシート・領収書（1週間）

#### 機能実装
- [ ] PDF生成ロジック
- [ ] QRコード生成
- [ ] 多言語対応（ja, en, zh, ko）
- [ ] 適格請求書フォーマット
- [ ] メール送信機能

#### UI実装
- [ ] レシートプレビュー画面
- [ ] 領収書再発行機能
- [ ] `/composables/useReceipt.ts` - レシートComposable

---

### Phase 5: データ分析連携（3日）

#### イベント実装
- [ ] `billing.completed` イベント発行
- [ ] `billing.refunded` イベント発行
- [ ] `billing.corrected` イベント発行

#### 統計API
- [ ] `GET /api/v1/admin/statistics/billing-summary` - 会計サマリー
- [ ] `GET /api/v1/admin/statistics/revenue-analysis` - 売上分析
- [ ] `GET /api/v1/admin/statistics/payment-methods` - 決済方法別分析

---

### Phase 6: テスト・品質保証（1週間）

#### 単体テスト
- [ ] 税金計算ロジック
- [ ] 割引計算ロジック
- [ ] 返金計算ロジック

#### 統合テスト
- [ ] 会計処理フロー（セッション対応）
- [ ] 複数決済方法併用
- [ ] 返金承認フロー

#### セキュリティテスト
- [ ] テナント分離検証
- [ ] 権限チェック検証
- [ ] 監査ログ記録検証

---

## 📝 備考

### 今後の拡張予定

- [ ] PMS連携（宿泊料金との統合精算）
- [ ] 外部決済ゲートウェイ連携（Stripe, Square等）
- [ ] 自動会計機能（AIによる異常検知・推奨アクション）
- [ ] モバイルアプリ対応（スマホでの会計処理）

---

**このSSOTはhotel-saas会計・請求機能の最高権威であり、実装時は必ずこのSSOTに準拠すること。**

