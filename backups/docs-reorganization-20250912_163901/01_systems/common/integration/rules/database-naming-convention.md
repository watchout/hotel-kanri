# 🗄️ データベース命名規則

**対象**: Luna（hotel-pms）、Suno（hotel-member）、Sun（hotel-saas）  
**管理者**: 統合管理者（ユーザー）  
**重要度**: 🚨 **CRITICAL** - 一貫性のある命名規則はシステム連携の基盤です

---

## 🎯 **基本原則**

### **命名規則の目的**
```
🔄 一貫性 = 理解しやすいコード + 効率的な開発 + エラー削減
📊 明確な規則 = チーム間の円滑な連携 + 自動化の促進
```

### **なぜ命名規則が重要か**
- ✅ **可読性**: コードとデータベースの理解が容易になる
- ✅ **保守性**: 変更や拡張が簡単になる
- ✅ **一貫性**: システム間の連携がスムーズになる
- ✅ **自動化**: コード生成やツール連携が効率化される

---

## 📋 **命名規則標準**

### **モデル名（テーブル名）**
- **パスカルケース（PascalCase）** を使用する
  - 例: `Tenant`, `Customer`, `Reservation`, `RoomGrade`
- 単数形を使用する（複数形は使用しない）
  - 例: `User`（`Users`ではない）

### **フィールド名（カラム名）**
- **パスカルケース（PascalCase）** を使用する
  - 例: `Id`, `Name`, `Email`, `CreatedAt`
- 省略形は避け、明確な名前を使用する
  - 例: `Description`（`Desc`ではない）

### **リレーション名**
- **パスカルケース（PascalCase）** を使用する
- 関連するモデル名を反映させる
  - 例: `User.Tenant`, `Reservation.Customer`

### **インデックス名**
- 命名パターン: `Idx{テーブル名}{フィールド名}`
  - 例: `IdxUserEmail`, `IdxReservationDate`

### **外部キー制約名**
- 命名パターン: `FK{子テーブル}{親テーブル}`
  - 例: `FKUserTenant`, `FKReservationCustomer`

### **一意制約名**
- 命名パターン: `Unq{テーブル名}{フィールド名}`
  - 例: `UnqUserEmail`, `UnqTenantDomain`

---

## 🔍 **特殊なケース**

### **列挙型（Enum）**
- **パスカルケース（PascalCase）** を使用する
  - 例: `UserRole`, `ReservationStatus`
- 値も **パスカルケース（PascalCase）** を使用する
  - 例: `Admin`, `Manager`, `Staff`

### **中間テーブル（多対多関連）**
- 関連する両方のテーブル名を組み合わせる
- **パスカルケース（PascalCase）** を使用する
  - 例: `UserRole`, `CustomerTag`

### **日時フィールド**
- 標準の命名を使用する
  - `CreatedAt`, `UpdatedAt`, `DeletedAt`
  - `StartDate`, `EndDate`, `PublishedAt`

---

## 🛠️ **実装ガイドライン**

### **Prismaスキーマでの実装**
```prisma
// 正しい命名規則の例
model User {
  Id                String   @id
  TenantId          String
  Email             String
  FirstName         String
  LastName          String
  CreatedAt         DateTime @default(now())
  UpdatedAt         DateTime @updatedAt
  Tenant            Tenant   @relation(fields: [TenantId], references: [Id])
}

// 列挙型の例
enum UserRole {
  Admin
  Manager
  Staff
}
```

### **既存コードの移行**
- 段階的に移行する
- 変更前に影響範囲を分析する
- すべての関連コードを更新する
- 十分なテストを実施する

---

## ⚠️ **注意点**

### **命名規則変更時の影響**
- データベーススキーマの変更
- ORM生成コードの変更
- アプリケーションコードの更新
- テストコードの更新

### **互換性の確保**
- 移行期間中は互換性レイヤーを検討
- 段階的な移行計画を立てる
- すべてのシステムで同時に変更する

---

## 📚 **参考資料**

### **業界標準**
- Microsoft .NET命名規則
- TypeScript/JavaScript命名規則
- Prisma推奨プラクティス

### **関連ドキュメント**
- [統一データベース管理ルール](unified-database-management-rules.md)
- [統一データベーススキーマ仕様書](../specifications/unified-database-schema-specification.md)

---

**🔖 このドキュメントは定期的に更新されます。最新版を必ず確認してください。**