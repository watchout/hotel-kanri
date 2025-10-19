# 🚀 hotel-member PostgreSQL統一基盤移行ガイド

**対象システム**: hotel-member (AI顧客管理システム)  
**移行期間**: 2025年2月〜3月  
**移行方式**: 段階的非破壊移行  
**責任者**: hotel-common統合管理者

---

## 📋 **移行概要**

hotel-memberのデータベースをhotel-commonで構築された統一PostgreSQL基盤に移行し、システム間連携の一元化を実現します。

### **移行目標**
- ✅ hotel-member独自PostgreSQLから統一基盤PostgreSQLへの移行
- ✅ hotel-commonライブラリとの統合
- ✅ ソーストラッキング・監査機能の適用
- ✅ 段階的ガバナンス（Level 0 → Level 1 → Level 2）の適用

---

## 🎯 **Phase 2b移行戦略（2025年2月-3月）**

### **Step 1: 移行準備（2025年2月第1週）**

#### **1.1 現状分析とバックアップ**
```bash
# hotel-memberの現在のDBスキーマ分析
cd /path/to/hotel-member
npm run db:analyze
npm run db:backup --target=pre-migration-backup

# データ容量・重要度の確認
npm run db:stats
```

#### **1.2 hotel-common依存関係追加**
```json
// hotel-member/package.json に追加
{
  "dependencies": {
    "hotel-common": "^1.2.0"
  }
}
```

#### **1.3 統一DB接続設定**
```typescript
// hotel-member/config/database.ts
import { hotelDb } from 'hotel-common'

// 段階移行用：既存DB + 統一DB並行接続
export const dbConfig = {
  legacy: process.env.MEMBER_DB_URL, // 既存PostgreSQL
  unified: process.env.HOTEL_COMMON_DB_URL, // 統一基盤
  migrationMode: 'dual-write' // 両方に書き込み
}
```

---

### **Step 2: 段階移行実装（2025年2月第2-3週）**

#### **2.1 段階的スキーママッピング**
```typescript
// hotel-member/migration/schema-mapping.ts
export const SCHEMA_MAPPING = {
  // hotel-member → hotel-common統一基盤
  'users': 'customers', // hotel-memberのusersテーブル → 統一基盤のcustomersテーブル
  'ranks': 'customer_ranks', // 会員ランク情報
  'points': 'customer_points', // ポイント履歴
  'reservations': 'reservations', // 予約情報（hotel-pms連携準備）
  'rewards': 'customer_rewards' // 特典情報
}

export const FIELD_MAPPING = {
  'users.id': 'customers.member_id',
  'users.name': 'customers.name',
  'users.email': 'customers.email',
  'users.phone': 'customers.phone',
  'users.rank_id': 'customers.rank_id',
  // ソーストラッキング自動追加
  'origin_system': 'hotel-member',
  'synced_at': () => new Date(),
  'updated_by_system': 'hotel-member'
}
```

#### **2.2 デュアル書き込み実装**
```typescript
// hotel-member/services/dual-write-service.ts
import { hotelDb } from 'hotel-common'
import { legacyDb } from '../config/legacy-database'

export class DualWriteService {
  async createCustomer(customerData: CustomerData) {
    const transaction = await Promise.allSettled([
      // 既存DB（メイン）
      legacyDb.users.create(customerData),
      // 統一基盤（並行書き込み）
      hotelDb.getClient().customer.create({
        data: {
          ...this.mapToUnifiedSchema(customerData),
          tenant_id: process.env.TENANT_ID,
          origin_system: 'hotel-member',
          synced_at: new Date(),
          updated_by_system: 'hotel-member'
        }
      })
    ])
    
    return this.handleDualWriteResult(transaction)
  }
  
  private mapToUnifiedSchema(data: any) {
    // スキーママッピング適用
    return applySchemaMapping(data, FIELD_MAPPING)
  }
}
```

---

### **Step 3: データ移行実行（2025年2月第4週）**

#### **3.1 移行スクリプト実行**
```bash
# hotel-memberディレクトリで実行
npm run migration:prepare
npm run migration:validate
npm run migration:execute --mode=incremental

# 進捗確認
npm run migration:status
```

#### **3.2 データ整合性検証**
```typescript
// hotel-member/scripts/data-validation.ts
export async function validateMigration() {
  const validationResults = await Promise.all([
    validateCustomerCount(),
    validatePointsConsistency(),
    validateRankMapping(),
    validateReservationLinks()
  ])
  
  const report = generateValidationReport(validationResults)
  console.log('🔍 移行データ検証結果:', report)
  
  if (report.criticalErrors > 0) {
    throw new Error('❌ 重要なデータ不整合が検出されました。移行を中止します。')
  }
  
  return report
}
```

---

### **Step 4: ガバナンスLevel 1適用（2025年3月第1週）**

#### **4.1 Level 1監視設定**
```typescript
// hotel-commonでガバナンス設定更新
import { governanceManager } from 'hotel-common'

governanceManager.updateGovernanceLevel(
  'hotel-member',
  1, // Level 1: 軽微な警告・非ブロッキング
  new Date(),
  'PostgreSQL移行完了により段階移行開始'
)
```

#### **4.2 統一API段階適用**
```typescript
// hotel-member/api/unified-api-adapter.ts
import { HotelApiClientFactory } from 'hotel-common'

export class UnifiedApiAdapter {
  private unifiedClient = HotelApiClientFactory.createMemberClient({
    tenantId: process.env.TENANT_ID,
    apiKey: process.env.MEMBER_API_KEY
  })
  
  async getCustomer(customerId: string) {
    try {
      // 統一API使用（Level 1で推奨）
      return await this.unifiedClient.customers.get(customerId)
    } catch (error) {
      // フォールバック：既存API
      console.warn('⚠️ 統一API呼び出し失敗、既存APIにフォールバック', error)
      return await legacyCustomerService.getCustomer(customerId)
    }
  }
}
```

---

## 🔧 **移行ツール・スクリプト**

### **移行スクリプト一式**
```bash
# hotel-memberプロジェクトに以下スクリプト追加
npm scripts:
  "migration:prepare": "node scripts/prepare-migration.js",
  "migration:validate": "node scripts/validate-data.js", 
  "migration:execute": "node scripts/execute-migration.js",
  "migration:rollback": "node scripts/rollback-migration.js",
  "migration:status": "node scripts/migration-status.js"
```

### **データ移行スクリプト詳細**
```typescript
// hotel-member/scripts/execute-migration.ts
import { hotelDb } from 'hotel-common'
import { HotelMigrationManager } from 'hotel-common'

export async function executeMigration() {
  const migrationManager = new HotelMigrationManager()
  
  try {
    // 1. 移行前バックアップ
    await migrationManager.createBackup('hotel-member-pre-migration')
    
    // 2. スキーマバージョン確認
    await migrationManager.checkSchemaCompatibility('hotel-member', '1.2.0')
    
    // 3. 段階的データ移行
    const migrationPlan = await migrationManager.createMigrationPlan({
      source: 'hotel-member-legacy',
      target: 'hotel-common-unified',
      strategy: 'incremental',
      batchSize: 1000
    })
    
    // 4. 移行実行
    const result = await migrationManager.executeMigration(migrationPlan)
    
    console.log('✅ hotel-member移行完了:', result)
    return result
    
  } catch (error) {
    console.error('❌ 移行エラー:', error)
    await migrationManager.rollback('hotel-member-pre-migration')
    throw error
  }
}
```

---

## ⚠️ **重要な注意事項**

### **データ保護優先原則**[[memory:3150174]]
1. **問題分析フェーズ**: 根本原因・影響範囲・緊急度の分析
2. **解決策検討フェーズ**: 複数選択肢の列挙・リスク評価・データ保護優先
3. **実行前確認フェーズ**: ユーザーに提示・承認後実行

### **絶対禁止事項**
- ❌ 既存データベースの削除・リセット
- ❌ バックアップなしでの移行実行
- ❌ 本番環境での試験的移行
- ❌ 他システムへの影響を考慮しない独断実行

### **必須確認事項**
- ✅ 移行前の完全バックアップ取得
- ✅ ロールバック手順の事前確認
- ✅ hotel-pmsとの予約機能重複回避
- ✅ hotel-saasとの顧客データ参照整合性確保

---

## 📊 **移行進捗管理**

### **マイルストーン**
- **2025年2月第1週**: 移行準備完了
- **2025年2月第2週**: デュアル書き込み実装完了
- **2025年2月第3週**: 移行スクリプト実装完了
- **2025年2月第4週**: データ移行実行・検証完了
- **2025年3月第1週**: Level 1ガバナンス適用

### **成功指標**
- データ移行成功率: 100%
- データ整合性エラー: 0件
- システム停止時間: 1時間以内
- 既存機能への影響: なし

---

## 🚨 **緊急時対応**

### **移行中トラブル対応**
```bash
# 緊急ロールバック
npm run migration:rollback --immediate
npm run system:health-check
npm run system:restart --safe-mode
```

### **エスカレーション基準**
- **Level 1**: データ不整合検出 → 移行一時停止・調査
- **Level 2**: システム障害発生 → 即座ロールバック
- **Level 3**: 全システム影響 → プロジェクトマネージャー緊急招集

---

## 📝 **移行完了後の確認項目**

### **機能確認**
- [ ] OTPログイン機能の正常動作
- [ ] 会員ランク・ポイントシステムの整合性
- [ ] 予約システムの正常動作
- [ ] AR館内宝探し機能の動作確認
- [ ] 管理画面での統一基盤データ表示

### **連携確認** 
- [ ] hotel-pmsとの予約データ連携
- [ ] hotel-saasとの顧客データ参照
- [ ] hotel-commonライブラリ経由でのAPI呼び出し
- [ ] 統一認証基盤との連携

### **監視・ログ確認**
- [ ] ソーストラッキングの正常記録
- [ ] システムイベント監査ログの記録
- [ ] パフォーマンス指標の正常値維持
- [ ] エラーログの異常なし

---

このガイドに従って移行作業を進めてください。不明な点や追加サポートが必要な場合は、hotel-common統合管理者までお声がけください。 