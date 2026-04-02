# 🔧 統一Prismaクライアント実装仕様書

**対象**: Luna（hotel-pms）、Suno（hotel-member）、Sun（hotel-saas）  
**管理者**: 統合管理者（ユーザー）  
**重要度**: 🚨 **CRITICAL** - システム統合の基盤  
**作成日**: 2025年1月27日

---

## 🎯 **統一方針**

### **基本原則**
```yaml
スキーマ統一: hotel-common/prisma/schema.prisma（唯一の真実）
クライアント統一: hotel-common配布の統一Prismaクライアント使用
各システム: 独自スキーマ・独自クライアント削除
接続方式: 各システムから直接PostgreSQL接続（負荷分散維持）
```

### **統一により実現される機能**
- ✅ **マルチテナント対応**: Row Level Security自動適用
- ✅ **統一セキュリティ**: テナント分離、権限制御
- ✅ **統一監査ログ**: 全操作の追跡・記録
- ✅ **データ整合性**: 同一スキーマによる一貫性保証
- ✅ **統一エラーハンドリング**: 標準化されたエラー処理

---

## 🏗️ **実装アーキテクチャ**

### **配置構成**
```mermaid
graph TD
    subgraph "hotel-common（配布元）"
        A1[prisma/schema.prisma<br/>統一スキーマ]
        A2[src/database/unified-client.ts<br/>統一Prismaクライアント]
    end
    
    subgraph "hotel-saas"
        B1[統一クライアントをインポート]
        B2[独自schema削除]
    end
    
    subgraph "hotel-member"  
        C1[統一クライアントをインポート]
        C2[独自schema削除]
    end
    
    subgraph "hotel-pms"
        D1[統一クライアントをインポート] 
        D2[独自schema削除]
    end
    
    subgraph "PostgreSQL"
        E[(hotel_unified_db)]
    end
    
    A1 --> B1
    A2 --> B1
    A1 --> C1  
    A2 --> C1
    A1 --> D1
    A2 --> D1
    
    B1 --> E
    C1 --> E
    D1 --> E
```

---

## 🔧 **統一Prismaクライアント仕様**

### **基本クラス設計**
```typescript
// hotel-common/src/database/unified-client.ts
export class UnifiedPrismaClient {
  private prisma: PrismaClient
  private tenantId: string
  private systemName: string
  private logger: HotelLogger

  constructor(config: {
    tenantId: string
    systemName: 'hotel-saas' | 'hotel-member' | 'hotel-pms'
    connectionLimit?: number
  })

  // マルチテナント対応
  async setTenant(tenantId: string): Promise<void>
  async withTenant<T>(tenantId: string, operation: () => Promise<T>): Promise<T>
  
  // 統一CRUD操作
  async create<T>(model: string, data: any): Promise<T>
  async findMany<T>(model: string, where?: any): Promise<T[]>  
  async update<T>(model: string, where: any, data: any): Promise<T>
  async delete<T>(model: string, where: any): Promise<T>
  
  // 監査ログ
  async logOperation(operation: string, model: string, data: any): Promise<void>
  
  // 接続管理
  async connect(): Promise<void>
  async disconnect(): Promise<void>
}
```

### **マルチテナント対応機能**
```typescript
// 自動テナント分離
await client.withTenant('tenant-123', async () => {
  // この中の全操作は自動的にtenant-123に限定される
  const customers = await client.findMany('customer', {})
  const reservation = await client.create('reservation', reservationData)
})
```

### **統一監査ログ機能**
```typescript
// 全操作が自動記録される
await client.create('customer', customerData)
// → audit_logテーブルに記録: 
// { operation: 'CREATE', model: 'customer', system: 'hotel-saas', tenant_id: 'xxx', timestamp: now() }
```

---

## 📋 **各システム実装手順**

### **Phase 1: 準備作業（全システム共通）**

#### **Step 1: hotel-commonから統一クライアント取得**
```bash
# 各システムのpackage.jsonに追加
{
  "dependencies": {
    "@hotel-common/unified-client": "file:/Users/kaneko/hotel-common"
  }
}

npm install
```

#### **Step 2: 環境変数設定**
```bash
# .env に追加
DATABASE_URL=postgresql://hotel_app:${DB_PASSWORD}@localhost:5432/hotel_unified_db
HOTEL_SYSTEM_NAME=hotel-saas  # システム名（hotel-member, hotel-pms）
TENANT_ID=your-tenant-id
```

### **Phase 2: 既存ファイル削除**

#### **削除対象ファイル**
```bash
# 各システムで削除
❌ prisma/schema.prisma
❌ prisma/migrations/
❌ src/generated/
❌ 独自データベースクライアント関連ファイル
```

### **Phase 3: 統一クライアント導入**

#### **基本インポート**
```typescript
// 旧コード（削除）
❌ import { PrismaClient } from './generated/prisma'
❌ const prisma = new PrismaClient()

// 新コード（追加）
✅ import { UnifiedPrismaClient } from '@hotel-common/unified-client'
✅ const client = new UnifiedPrismaClient({
  tenantId: process.env.TENANT_ID!,
  systemName: process.env.HOTEL_SYSTEM_NAME as any,
  connectionLimit: 20
})
```

#### **CRUD操作の変更**
```typescript
// 旧コード
❌ await prisma.customer.create({ data: customerData })
❌ await prisma.reservation.findMany({ where: { tenant_id: tenantId } })

// 新コード  
✅ await client.withTenant(tenantId, async () => {
  await client.create('customer', customerData)
  await client.findMany('reservation', {})  // tenant_idは自動追加
})
```

---

## 📋 **システム別実装指示**

### **☀️ Sun（hotel-saas）への指示**
```yaml
優先度: CRITICAL
期限: 3日以内
作業内容:
  1. 独自prisma/schema.prismaを削除
  2. 統一クライアントをインポート
  3. 82個のAPI終端点を統一クライアントに変更
  4. テナント対応のため withTenant() で全操作をラップ
  5. 注文→請求連携でテナント間違い防止
```

### **⚡ Suno（hotel-member）への指示**  
```yaml
優先度: CRITICAL
期限: 3日以内
作業内容:
  1. 独自prisma/schema.prismaを削除
  2. SQLAlchemy → 統一Prismaクライアントに変更
  3. FastAPI × Python環境での統一クライアント連携
  4. 顧客管理での厳密なテナント分離
  5. ポイント・ランク計算でのテナント間違い防止
```

### **🌙 Luna（hotel-pms）への指示**
```yaml
優先度: CRITICAL  
期限: 3日以内
作業内容:
  1. 独自prisma/schema.prismaを削除
  2. 統一クライアントをインポート
  3. 予約管理・チェックイン/アウトでの統一クライアント使用
  4. OTA連携でのテナント分離（ダブルブッキング防止）
  5. フロント業務での統一監査ログ記録
```

---

## 🚨 **重要な注意事項**

### **データ移行は不要**
```yaml
理由: 同じPostgreSQLデータベースを使用
作業: スキーマとクライアントの変更のみ
リスク: 低（データ破損なし）
```

### **段階移行対応**
```yaml
方針: 一気に全変更ではなく段階的移行可能
手順:
  1. 統一クライアント導入（既存と並行）
  2. 一部APIで統一クライアントテスト
  3. 段階的に全API移行
  4. 独自クライアント削除
```

### **緊急時ロールバック**
```yaml
準備: 独自クライアントのバックアップ保持
手順: 統一クライアントインポートを削除、独自クライアント復活
時間: 30分以内でロールバック可能
```

---

## ✅ **完了確認チェックリスト**

### **各システム共通**
- [ ] 独自prisma/schema.prisma削除完了
- [ ] 統一クライアントインポート完了  
- [ ] 全CRUD操作が統一クライアント経由
- [ ] withTenant()での適切なテナント分離
- [ ] エラーなく起動・動作確認

### **統合テスト**
- [ ] 3システム同時起動確認
- [ ] テナント分離動作確認
- [ ] クロスシステムデータ整合性確認
- [ ] 監査ログ記録確認
- [ ] パフォーマンス問題なし確認

---

## 📞 **サポート・質問**

**実装中の質問・問題**: 統合管理者（ユーザー）に即座報告  
**緊急時対応**: 統合アシスタント（Iza）がサポート  
**進捗報告**: 日次で統合管理者に状況報告

---

**統合アシスタント**: このドキュメントに基づいて各システムに実装指示を出しますか？ 